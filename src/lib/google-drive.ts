
'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

// Ensure the environment variable is loaded
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

const disabledError = () => {
    throw new Error("Google Drive integration is not configured. Please set GOOGLE_APPLICATION_CREDENTIALS_JSON in your environment variables.");
};

let createOrderFolder: (orderId: string) => Promise<string> = disabledError;
let uploadFileToDrive: (file: File, folderId: string) => Promise<{ id: string; webViewLink: string; }> = disabledError;


// Check if credentials are provided and not an empty object string
if (!credentialsJson || credentialsJson === '{}') {
  console.warn("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set. Google Drive features will be disabled.");
} else {
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const APP_ROOT_FOLDER_NAME = 'Assignly App Uploads';

  async function findOrCreateRootFolder(): Promise<string> {
    try {
      const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${APP_ROOT_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
      } else {
        const fileMetadata = {
          name: APP_ROOT_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        };
        const folder = await drive.files.create({
          requestBody: fileMetadata,
          fields: 'id',
        });
        return folder.data.id!;
      }
    } catch (error) {
      console.error("Error finding or creating root folder:", error);
      throw new Error("Could not initialize the application folder in Google Drive.");
    }
  }


  createOrderFolder = async (orderId: string): Promise<string> => {
      const rootFolderId = await findOrCreateRootFolder();
      const fileMetadata = {
          name: `Order_${orderId}`,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId]
      };
      try {
          const folder = await drive.files.create({
              requestBody: fileMetadata,
              fields: 'id'
          });
          return folder.data.id!;
      } catch (error) {
          console.error("Error creating order folder:", error);
          throw new Error("Could not create a dedicated folder for this order in Google Drive.");
      }
  }

  uploadFileToDrive = async (file: File, folderId: string): Promise<{id: string, webViewLink: string}> => {
      const fileMetadata = {
          name: file.name,
          parents: [folderId],
      };

      const media = {
          mimeType: file.type,
          body: Readable.from(Buffer.from(await file.arrayBuffer())),
      };

      try {
          const uploadedFile = await drive.files.create({
              requestBody: fileMetadata,
              media: media,
              fields: 'id, webViewLink',
          });

          const fileId = uploadedFile.data.id!;

          // Make the file publicly readable
          await drive.permissions.create({
              fileId: fileId,
              requestBody: {
                  role: 'reader',
                  type: 'anyone',
              }
          });

          return { id: fileId, webViewLink: uploadedFile.data.webViewLink! };
      } catch (error: any) {
          console.error(`Error uploading file "${file.name}":`, error);
          throw new Error(`Failed to upload ${file.name} to Google Drive.`);
      }
  }
}

export { createOrderFolder, uploadFileToDrive };
