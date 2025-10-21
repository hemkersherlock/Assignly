'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

const disabledError = () => {
    throw new Error("Google Drive integration is not configured. Please set GOOGLE_APPLICATION_CREDENTIALS_JSON and GOOGLE_DRIVE_PARENT_FOLDER_ID in your environment variables.");
};

if (!credentialsJson || credentialsJson === '{}' || !parentFolderId) {
  console.warn("Google Drive integration is not fully configured. Features will be disabled.");
  module.exports = {
      createOrderFolder: disabledError,
      uploadFileToDrive: disabledError,
  }
} else {
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const createOrderFolder = async (orderId: string): Promise<string> => {
      const fileMetadata = {
          name: `Order_${orderId}`,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
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

  const uploadFileToDrive = async (file: File, folderId: string): Promise<{id: string, webViewLink: string}> => {
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

  module.exports = {
    createOrderFolder,
    uploadFileToDrive
  }
}
