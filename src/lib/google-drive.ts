'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

// Ensure the environment variable is loaded
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

if (!credentialsJson) {
  throw new Error("The GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set.");
}

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


export async function createOrderFolder(orderId: string): Promise<string> {
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

export async function uploadFileToDrive(fileData: {name: string, type: string, size: number, data: number[]}, folderId: string): Promise<{id: string, webViewLink: string}> {
    const fileMetadata = {
        name: fileData.name,
        parents: [folderId],
    };

    const media = {
        mimeType: fileData.type,
        body: Readable.from(Buffer.from(new Uint8Array(fileData.data))),
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
        console.error(`Error uploading file "${fileData.name}":`, error);
        throw new Error(`Failed to upload ${fileData.name} to Google Drive.`);
    }
}