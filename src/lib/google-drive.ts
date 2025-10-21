
'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const clientEmailFromVars = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
const privateKeyFromVars = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const disabledError = () => {
    throw new Error(
      "Google Drive integration is not configured. Set GOOGLE_DRIVE_PARENT_FOLDER_ID and either GOOGLE_APPLICATION_CREDENTIALS_JSON or (GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY)."
    );
};

function buildServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  try {
    if (credentialsJson && credentialsJson !== '{}') {
      const parsed = JSON.parse(credentialsJson);
      if (parsed.client_email && parsed.private_key) {
        return { client_email: parsed.client_email, private_key: parsed.private_key };
      }
    }
  } catch (_) {
    // Fall through to env var pair
  }
  if (clientEmailFromVars && privateKeyFromVars) {
    return { client_email: clientEmailFromVars, private_key: privateKeyFromVars };
  }
  return null;
}

function assertConfigured(): { parentFolderId: string; credentials: { client_email: string; private_key: string } } {
  const creds = buildServiceAccountCredentials();
  if (!parentFolderId || !creds) {
    return disabledError() as never;
  }
  return { parentFolderId, credentials: creds };
}

function getDriveClient() {
  const { credentials } = assertConfigured();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

function mapGoogleApiError(error: any, action: string): Error {
  const status = error?.code || error?.response?.status;
  const message = error?.errors?.[0]?.message || error?.response?.data?.error?.message || error?.message || String(error);
  if (status === 401) {
    return new Error(`${action} failed: Unauthorized (401). Check service account credentials.`);
  }
  if (status === 403) {
    return new Error(`${action} failed: Permission denied (403). Ensure the service account has access and the Drive API is enabled.`);
  }
  if (status === 404) {
    return new Error(`${action} failed: Not found (404). Verify GOOGLE_DRIVE_PARENT_FOLDER_ID and that the service account can see it.`);
  }
  if (status === 429) {
    return new Error(`${action} failed: Rate limited (429). Please retry later.`);
  }
  return new Error(`${action} failed: ${message}`);
}

export async function createOrderFolder(orderId: string): Promise<string> {
  assertConfigured();
  const drive = getDriveClient();
  
  const fileMetadata = {
      name: `Order_${orderId}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
  };
  try {
      const folder = await drive.files.create({
          requestBody: fileMetadata,
          fields: 'id',
          supportsAllDrives: true,
      });
      return folder.data.id!;
  } catch (error) {
      console.error("Error creating order folder:", error);
      throw mapGoogleApiError(error, 'Creating folder');
  }
}

// Accept a serializable object instead of a File or Buffer
export async function uploadFileToDrive(
    fileData: { name: string; type: string; size: number; data: number[] }, 
    folderId: string
): Promise<{id: string, webViewLink: string}> {
    assertConfigured();
    const drive = getDriveClient();

    const fileMetadata = {
        name: fileData.name,
        parents: [folderId],
    };

    // Reconstruct the Buffer from the number array
    const media = {
        mimeType: fileData.type,
        body: Readable.from(Buffer.from(new Uint8Array(fileData.data))),
    };

    try {
        const uploadedFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });

        const fileId = uploadedFile.data.id!;

        // Try to make the file publicly readable. If this fails (e.g., shared drive settings), continue.
        try {
          await drive.permissions.create({
              fileId: fileId,
              requestBody: {
                  role: 'reader',
                  type: 'anyone',
              }
          });
        } catch (permErr) {
          console.warn(`Could not set public permission for ${fileData.name}:`, permErr);
        }

        const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
        return { id: fileId, webViewLink };
    } catch (error: any) {
        console.error(`Error uploading file "${fileData.name}":`, error);
        throw mapGoogleApiError(error, `Uploading ${fileData.name}`);
    }
}
