'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

const client_email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
const private_key = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

const disabledError = () => {
    throw new Error("Google Drive integration is not configured. Please ensure GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, and GOOGLE_DRIVE_PARENT_FOLDER_ID are set in your environment variables.");
};

export async function createOrderFolder(orderId: string): Promise<string> {
  console.log('🔍 Debug: Starting folder creation for order:', orderId);
  console.log('🔍 Debug: Environment variables check:');
  console.log('🔍 Debug: client_email exists:', !!client_email);
  console.log('🔍 Debug: private_key exists:', !!private_key);
  console.log('🔍 Debug: parentFolderId exists:', !!parentFolderId);
  console.log('🔍 Debug: parentFolderId value:', parentFolderId);
  
  if (!client_email || !private_key || !parentFolderId) {
    console.error('❌ Debug: Missing environment variables');
    return disabledError();
  }

  try {
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
    
    console.log('🔍 Debug: Creating folder with metadata:', fileMetadata);
    
    const folder = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id'
    });
    
    console.log('✅ Debug: Folder created successfully with ID:', folder.data.id);
    return folder.data.id!;
  } catch (error: any) {
      console.error("❌ Debug: Error creating order folder:", error);
      console.error('❌ Debug: Error details:', {
          message: error.message,
          code: error.code,
          status: error.status,
          errors: error.errors
      });
      throw new Error(`A Google Drive API error occurred while creating folder for order ${orderId}. ${error.message}`);
  }
}

// Accept a serializable object instead of a File or Buffer
export async function uploadFileToDrive(
    fileData: { name: string; type: string; size: number; data: number[] }, 
    folderId: string
): Promise<{id: string, webViewLink: string}> {
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
        name: fileData.name,
        parents: [folderId],
    };

    // Reconstruct the Buffer from the number array
    console.log('🔍 Debug: Reconstructing file data...');
    console.log('🔍 Debug: Original data array length:', fileData.data.length);
    console.log('🔍 Debug: First 10 data values:', fileData.data.slice(0, 10));
    
    const reconstructedBuffer = Buffer.from(new Uint8Array(fileData.data));
    console.log('🔍 Debug: Reconstructed buffer length:', reconstructedBuffer.length);
    console.log('🔍 Debug: First 10 buffer bytes:', Array.from(reconstructedBuffer.slice(0, 10)));
    
    const media = {
        mimeType: fileData.type,
        body: Readable.from(reconstructedBuffer),
    };

    try {
        console.log('🔍 Debug: Starting file upload for:', fileData.name);
        console.log('🔍 Debug: File size:', fileData.size, 'bytes');
        console.log('🔍 Debug: File type:', fileData.type);
        console.log('🔍 Debug: Data array length:', fileData.data.length);
        console.log('🔍 Debug: Target folder ID:', folderId);
        
        const uploadedFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        console.log('✅ Debug: File uploaded successfully, ID:', uploadedFile.data.id);
        const fileId = uploadedFile.data.id!;

        // Make the file publicly readable
        console.log('🔍 Debug: Setting file permissions...');
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            }
        });

        console.log('✅ Debug: File permissions set successfully');
        return { id: fileId, webViewLink: uploadedFile.data.webViewLink! };
    } catch (error: any) {
        console.error(`❌ Debug: Error uploading file "${fileData.name}":`, error);
        console.error('❌ Debug: Error details:', {
            message: error.message,
            code: error.code,
            status: error.status,
            errors: error.errors
        });
        throw new Error(`Failed to upload ${fileData.name} to Google Drive: ${error.message}`);
    }
}