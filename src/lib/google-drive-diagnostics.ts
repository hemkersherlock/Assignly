'use server';

import { google, drive_v3 } from 'googleapis';

/**
 * Comprehensive diagnostic tool for Google Drive API setup
 * This will help identify exactly what's wrong with your configuration
 */
export async function diagnoseGoogleDriveSetup() {
  const results = {
    environmentVariables: {} as Record<string, any>,
    credentials: null as any,
    parentFolderAccess: null as any,
    apiPermissions: null as any,
    errors: [] as string[],
  };

  try {
    // 1. Check environment variables
    results.environmentVariables = {
      GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ? 'SET' : 'MISSING',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'SET' : 'MISSING',
      GOOGLE_DRIVE_CLIENT_EMAIL: process.env.GOOGLE_DRIVE_CLIENT_EMAIL ? 'SET' : 'MISSING',
      GOOGLE_DRIVE_PRIVATE_KEY: process.env.GOOGLE_DRIVE_PRIVATE_KEY ? 'SET' : 'MISSING',
    };

    // 2. Test credentials parsing
    try {
      const jsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
      const emailEnv = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
      const keyEnvRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

      if (jsonEnv && jsonEnv !== '{}') {
        const text = jsonEnv.startsWith('{') ? jsonEnv : Buffer.from(jsonEnv, 'base64').toString('utf8');
        const parsed = JSON.parse(text);
        results.credentials = {
          source: 'GOOGLE_APPLICATION_CREDENTIALS_JSON',
          client_email: parsed.client_email,
          project_id: parsed.project_id,
          private_key_length: parsed.private_key?.length || 0,
        };
      } else if (emailEnv && keyEnvRaw) {
        results.credentials = {
          source: 'INDIVIDUAL_VARS',
          client_email: emailEnv,
          private_key_length: keyEnvRaw.length,
        };
      } else {
        results.errors.push('No valid credentials found in environment variables');
        return results;
      }
    } catch (error) {
      results.errors.push(`Credential parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return results;
    }

    // 3. Test authentication
    let auth: any;
    try {
      const credentials = results.credentials.source === 'GOOGLE_APPLICATION_CREDENTIALS_JSON' 
        ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!)
        : {
            client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          };

      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
      
      // Test authentication by getting access token
      const accessToken = await auth.getAccessToken();
      results.apiPermissions = {
        authentication: 'SUCCESS',
        accessToken: accessToken ? 'OBTAINED' : 'FAILED',
      };
    } catch (error) {
      results.errors.push(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return results;
    }

    // 4. Test parent folder access
    try {
      const drive = google.drive({ version: 'v3', auth });
      const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;
      
      const response = await drive.files.get({
        fileId: parentFolderId,
        fields: 'id, name, mimeType, trashed, permissions',
        supportsAllDrives: true,
      });

      results.parentFolderAccess = {
        status: 'SUCCESS',
        folderId: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        trashed: response.data.trashed,
        isFolder: response.data.mimeType === 'application/vnd.google-apps.folder',
        permissions: response.data.permissions?.length || 0,
      };

      // 5. Test folder creation (dry run)
      try {
        const testFolderMetadata = {
          name: `TEST_FOLDER_${Date.now()}`,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        };

        const testFolder = await drive.files.create({
          requestBody: testFolderMetadata,
          fields: 'id',
          supportsAllDrives: true,
        });

        // Clean up test folder
        await drive.files.delete({
          fileId: testFolder.data.id!,
          supportsAllDrives: true,
        });

        results.apiPermissions = {
          ...results.apiPermissions,
          folderCreation: 'SUCCESS',
        };
      } catch (error: any) {
        results.apiPermissions = {
          ...results.apiPermissions,
          folderCreation: 'FAILED',
          folderCreationError: error.message,
        };
      }

    } catch (error: any) {
      const status = error?.code || error?.response?.status;
      results.parentFolderAccess = {
        status: 'FAILED',
        error: error.message,
        statusCode: status,
      };
      
      if (status === 403) {
        results.errors.push('Permission denied. The service account needs to be shared with the parent folder as an "Editor".');
      } else if (status === 404) {
        results.errors.push('Parent folder not found. Check that GOOGLE_DRIVE_PARENT_FOLDER_ID is correct.');
      }
    }

  } catch (error) {
    results.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return results;
}