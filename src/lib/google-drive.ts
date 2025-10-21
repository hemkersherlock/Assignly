
'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

const client_email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
// The private_key needs to have its newlines properly escaped when stored in .env
const private_key = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

const disabledError = () => {
    throw new Error("Google Drive integration is not configured. Please ensure GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, and GOOGLE_DRIVE_PARENT_FOLDER_ID are set in your environment variables.");
};

export async function createOrderFolder(orderId: string): Promise<string> {
  if (!client_email || !private_key || !parentFolderId) {
    return disabledError();
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email,
        private_key,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });
  
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

export async function uploadFileToDrive(file: File, folderId: string): Promise<{id: string, webViewLink: string}> {
    if (!client_email || !private_key || !parentFolderId) {
      return disabledError();
    }
    
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email,
            private_key,
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

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
