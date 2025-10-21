
'use server';

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export const runtime = 'nodejs';

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

  // Option A: Use the full JSON credentials string (preferred for hosting platforms)
  if (GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const parsedCreds = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON);
      if (parsedCreds.client_email && parsedCreds.private_key) {
        return {
          client_email: parsedCreds.client_email,
          // The private key from JSON doesn't need newline replacement
          private_key: parsedCreds.private_key,
        };
      }
    } catch (e) {
      throw new Error(
        'Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON. Please ensure it is a valid, non-empty JSON string.'
      );
    }
  }

  // Option B: Fallback to individual environment variables
  if (GOOGLE_DRIVE_CLIENT_EMAIL && GOOGLE_DRIVE_PRIVATE_KEY) {
    return {
      client_email: GOOGLE_DRIVE_CLIENT_EMAIL,
      // Restore newlines that are escaped in environment variables
      private_key: GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  // If neither method works, throw a comprehensive error
  throw new Error(
    'Google Drive credentials are not configured. Please set either GOOGLE_APPLICATION_CREDENTIALS_JSON OR (GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY).'
  );
}

/**
 * Creates and returns an authenticated Google Drive API client.
 * @returns {drive_v3.Drive} An authenticated Google Drive client instance.
 */
function getDriveClient(): drive_v3.Drive {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Handles API errors and maps them to user-friendly, actionable messages.
 * @param {any} error - The error object caught from the Google API call.
 * @param {string} context - A string describing the operation that failed (e.g., "creating folder").
 * @returns {Error} A new Error with a user-friendly message.
 */
function handleGoogleApiError(error: any, context: string): Error {
  const originalMessage = error.message || 'An unknown error occurred.';
  console.error(`Google Drive API Error during ${context}:`, originalMessage, error.errors);

  const status = error.code;

  if (status === 401) {
    return new Error(
      'Google Drive authentication failed (Unauthorized). Please check if the service account credentials are correct and valid.'
    );
  }
  if (status === 403) {
    return new Error(
      'Permission denied. Please ensure the Google Drive API is enabled in your Google Cloud project and that the parent folder has been shared with the service account email.'
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

  // For other errors, return a generic message
  return new Error(`A Google Drive API error occurred while ${context}.`);
}


/**
 * Creates a new folder for an order in Google Drive.
 * @param {string} orderId - The unique ID of the order.
 * @returns {Promise<string>} The ID of the newly created folder.
 * @throws {Error} If folder creation fails.
 */
export async function createOrderFolder(orderId: string): Promise<string> {
  try {
    const drive = getDriveClient();
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;

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
  try {
    const drive = getDriveClient();

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

    // Best-effort attempt to make the file publicly readable.
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
    
    // Prefer the direct webViewLink, but construct one as a fallback.
    const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return { id: fileId, webViewLink };

  } catch (error) {
    // Pass file name for better error context
    throw handleGoogleApiError(error, `uploading file "${fileData.name}"`);
  }
}
