
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

type ServiceAccountCreds = { client_email: string; private_key: string };

function tryParseJson(text: string): any {
  try { return JSON.parse(text); } catch { return null; }
}

function maybeBase64Decode(text: string): string {
  try {
    // Heuristics: if it doesn't start with '{', try base64
    if (!text.trim().startsWith('{')) {
      return Buffer.from(text, 'base64').toString('utf8');
    }
  } catch {}
  return text;
}

/**
 * Retrieves and validates Google Drive credentials from environment variables.
 * It supports a full JSON string, a base64 encoded JSON string, or individual email/key variables.
 * @returns {ServiceAccountCreds} The validated credentials.
 * @throws {Error} If required environment variables are not set or invalid.
 */
function getCredentials(): ServiceAccountCreds {
    if (!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
        throw new Error('Google Drive is not configured. Missing required environment variable: GOOGLE_DRIVE_PARENT_FOLDER_ID.');
    }

    const jsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
    const emailEnv = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
    const keyEnvRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

    if (jsonEnv && jsonEnv !== '{}') {
        const text = maybeBase64Decode(jsonEnv);
        const parsed = tryParseJson(text);
        if (parsed) {
            const client_email = parsed.client_email as string | undefined;
            const private_key = parsed.private_key as string | undefined;
            if (client_email && private_key) {
                return { client_email, private_key: private_key.replace(/\\n/g, '\n') };
            }
        }
    }

    if (emailEnv && keyEnvRaw) {
        const private_key = keyEnvRaw.replace(/\\n/g, '\n');
        return { client_email: emailEnv, private_key };
    }

    throw new Error('Credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (JSON or base64) or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY.');
}

/**
 * Creates and returns an authenticated Google Drive API client.
 * @returns {object} An object containing the drive client and the service account email.
 */
function getDriveClient(): { drive: drive_v3.Drive, saEmail: string } {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return {
    drive: google.drive({ version: 'v3', auth }),
    saEmail: credentials.client_email,
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
  const status = error?.code || error?.response?.status;
  const originalMessage = error.message || 'An unknown error occurred.';

  console.error(`Google Drive API Error during ${context}:`, {
      status: status,
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
      'Permission denied. Please ensure the Google Drive API is enabled in your GCP project and the parent folder has been shared with the service account email as an "Editor".'
    );
  }
  if (status === 404) {
    return new Error(
      `Resource not found (404). If creating a folder, verify that the GOOGLE_DRIVE_PARENT_FOLDER_ID is correct. If uploading a file, this could indicate a temporary issue.`
    );
  }
  if (status === 429) {
    return new Error('Google Drive API rate limit exceeded. Please try again later.');
  }

  // Fallback to a generic but informative error.
  return new Error(`A Google Drive API error occurred while ${context}. Status: ${status || 'unknown'}. Message: ${originalMessage}`);
}


/**
 * Creates a new folder for an order in Google Drive.
 * @param {string} orderId - The unique ID of the order.
 * @returns {Promise<string>} The ID of the newly created folder.
 * @throws {Error} If folder creation fails.
 */
export async function createOrderFolder(orderId: string): Promise<string> {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;
  const { drive, saEmail } = getDriveClient();
  
  try {
    // 1. Verify access to the parent folder before trying to create anything.
    await verifyParentFolderAccess(drive, parentFolderId, saEmail);

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
    // If the error came from our verification step, it's already specific.
    // Otherwise, wrap it with our generic handler.
    if (error instanceof Error && (error.message.includes('(404)') || error.message.includes('(403)'))) {
        throw error;
    }
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
