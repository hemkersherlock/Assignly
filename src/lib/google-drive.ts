
'use server';

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

/**
 * Interface for the serializable file data passed from the client.
 */
export interface SerializableFile {
  name: string;
  type: string;
  size: number;
  data: number[];
}

/**
 * Interface for Google Auth credentials.
 */
interface GoogleDriveCredentials {
  client_email: string;
  private_key: string;
}

/**
 * Retrieves and validates Google Drive credentials from environment variables.
 * It supports either a full JSON string or individual email/key variables.
 * @returns {GoogleDriveCredentials} The validated credentials.
 * @throws {Error} If required environment variables are not set.
 */
function getCredentials(): GoogleDriveCredentials {
  const {
    GOOGLE_APPLICATION_CREDENTIALS_JSON,
    GOOGLE_DRIVE_CLIENT_EMAIL,
    GOOGLE_DRIVE_PRIVATE_KEY,
    GOOGLE_DRIVE_PARENT_FOLDER_ID,
  } = process.env;

  if (!GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    throw new Error(
      'Google Drive is not configured. Missing required environment variable: GOOGLE_DRIVE_PARENT_FOLDER_ID.'
    );
  }

  if (GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const parsedCreds = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON);
      if (parsedCreds.client_email && parsedCreds.private_key) {
        return {
          client_email: parsedCreds.client_email,
          private_key: parsedCreds.private_key,
        };
      }
    } catch (e) {
      throw new Error(
        'Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON. Please ensure it is a valid, non-empty JSON string.'
      );
    }
  }

  if (GOOGLE_DRIVE_CLIENT_EMAIL && GOOGLE_DRIVE_PRIVATE_KEY) {
    return {
      client_email: GOOGLE_DRIVE_CLIENT_EMAIL,
      private_key: GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  throw new Error(
    'Google Drive credentials are not configured. Please set either GOOGLE_APPLICATION_CREDENTIALS_JSON OR (GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY).'
  );
}

/**
 * Creates and returns an authenticated Google Drive API client.
 * @returns {object} An object containing the drive client and the service account email.
 */
function getDriveClient(): { drive: drive_v3.Drive, client_email: string } {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return {
    drive: google.drive({ version: 'v3', auth }),
    client_email: credentials.client_email,
  };
}

/**
 * Verifies that the service account has access to the parent folder.
 * @param drive - The authenticated Google Drive client.
 * @param parentId - The ID of the parent folder.
 * @param saEmail - The service account email address.
 * @throws {Error} If the parent folder is not accessible.
 */
async function verifyParentFolderAccess(drive: drive_v3.Drive, parentId: string, saEmail: string) {
    try {
        await drive.files.get({
            fileId: parentId,
            fields: 'id',
            supportsAllDrives: true,
        });
    } catch (err: any) {
        const status = err?.code || err?.response?.status;
        console.error('Parent folder access check failed:', { status, parentId, saEmail });
        if (status === 404) {
            throw new Error(`Parent folder not found (404). Please verify that GOOGLE_DRIVE_PARENT_FOLDER_ID is correct: ${parentId}`);
        }
        if (status === 403) {
            throw new Error(`Permission denied (403). Please share the parent folder with the service account email "${saEmail}" as an "Editor".`);
        }
        throw new Error(`Failed to access parent folder. Ensure it exists and the service account has permissions.`);
    }
}


/**
 * Handles API errors and maps them to user-friendly, actionable messages.
 * @param {any} error - The error object caught from the Google API call.
 * @param {string} context - A string describing the operation that failed.
 * @returns {Error} A new Error with a user-friendly message.
 */
function handleGoogleApiError(error: any, context: string): Error {
  const originalMessage = error.message || 'An unknown error occurred.';
  const status = error.code;
  console.error(`Google Drive API Error during ${context}:`, {
      status,
      message: originalMessage,
      errors: error.errors
  });

  if (status === 401) {
    return new Error(
      'Google Drive authentication failed (Unauthorized). Please check if the service account credentials in your environment variables are correct and valid.'
    );
  }
  if (status === 403) {
    return new Error(
      'Permission denied. Please ensure the Google Drive API is enabled and the parent folder has been shared with the service account email as an "Editor".'
    );
  }
  if (status === 404) {
    return new Error(
      `Parent folder not found. Please verify that the GOOGLE_DRIVE_PARENT_FOLDER_ID is correct and the service account has access to it.`
    );
  }
  if (status === 429) {
    return new Error('Google Drive API rate limit exceeded. Please try again later.');
  }

  return new Error(`A Google Drive API error occurred while ${context}.`);
}


/**
 * Creates a new folder for an order in Google Drive.
 * @param {string} orderId - The unique ID of the order.
 * @returns {Promise<string>} The ID of the newly created folder.
 * @throws {Error} If folder creation fails.
 */
export async function createOrderFolder(orderId: string): Promise<string> {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;
  const { drive, client_email } = getDriveClient();
  
  try {
    // 1. Verify access to the parent folder before trying to create anything.
    await verifyParentFolderAccess(drive, parentFolderId, client_email);

    // 2. If access is verified, proceed to create the order folder.
    const fileMetadata = {
      name: `Order_${orderId}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });
    
    return folder.data.id!;
  } catch (error) {
    // Re-throw errors from verification or creation, which are now more specific.
    throw handleGoogleApiError(error, `creating folder for order ${orderId}`);
  }
}

/**
 * Uploads a file to a specified folder in Google Drive.
 * @param {SerializableFile} fileData - The serializable file object from the client.
 * @param {string} folderId - The ID of the parent folder in Google Drive.
 * @returns {Promise<{id: string, webViewLink: string}>} An object containing the new file's ID and public view link.
 * @throws {Error} If file upload fails.
 */
export async function uploadFileToDrive(
  fileData: SerializableFile,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  let fileId: string | null = null;
  const { drive } = getDriveClient();
  try {
    const fileMetadata = {
      name: fileData.name,
      parents: [folderId],
    };

    const media = {
      mimeType: fileData.type,
      body: Readable.from(Buffer.from(new Uint8Array(fileData.data))),
    };

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    fileId = uploadedFile.data.id!;
    if (!fileId) {
      throw new Error('File ID was not returned from Google Drive API.');
    }

    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });
    } catch (permError: any) {
      console.warn(
        `Warning: Could not set public permissions for file "${fileData.name}" (ID: ${fileId}). This may be due to shared drive policies. The file was still uploaded.`,
        permError.message
      );
    }
    
    const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return { id: fileId, webViewLink };

  } catch (error) {
    throw handleGoogleApiError(error, `uploading file "${fileData.name}"`);
  }
}
