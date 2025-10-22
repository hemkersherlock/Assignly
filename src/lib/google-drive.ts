
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
    if (!text.trim().startsWith('{')) {
      return Buffer.from(text, 'base64').toString('utf8');
    }
  } catch {}
  return text;
}

/**
 * Retrieves and validates Google Drive credentials from environment variables.
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
            const private_key_raw = parsed.private_key as string | undefined;
            if (client_email && private_key_raw) {
                return { client_email, private_key: private_key_raw.replace(/\\n/g, '\n') };
            }
        }
    }

    if (emailEnv && keyEnvRaw) {
        const private_key = keyEnvRaw.replace(/\\n/g, '\n');
        return { client_email: emailEnv, private_key };
    }

    throw new Error('Credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (JSON or base64) or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY.');
}

// Log diagnostic info once at server start
const credsForLog = getCredentials();
console.info(`[Assignly] Google Drive integration loaded. Using SA: ${credsForLog.client_email}, Parent Folder ID Prefix: ${process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID?.substring(0, 6)}...`);


/**
 * Creates and returns an authenticated Google Drive API client for each request.
 * @returns {object} An object containing the drive client and the service account email.
 */
function getDriveClient(): { drive: drive_v3.Drive, saEmail: string } {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return {
    drive: google.drive({ version: 'v3', auth }),
    saEmail: credentials.client_email,
  };
}


/**
 * Verifies that the service account has access to the parent folder and it's a valid folder.
 * @param drive - The authenticated Google Drive client.
 * @param parentId - The ID of the parent folder.
 * @param saEmail - The service account email address.
 * @throws {Error} If the parent folder is not accessible or invalid.
 */
async function verifyParentFolderAccess(drive: drive_v3.Drive, parentId: string, saEmail: string) {
    try {
        const response = await drive.files.get({
            fileId: parentId,
            fields: 'id, name, mimeType, trashed',
            supportsAllDrives: true,
        });

        if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
            throw new Error(`The specified GOOGLE_DRIVE_PARENT_FOLDER_ID does not point to a folder.`);
        }

        if (response.data.trashed) {
            throw new Error(`The specified parent folder is in the trash. Please restore it.`);
        }
    } catch (err: any) {
        const status = err?.code || err?.response?.status;
        console.error('Parent folder access check failed:', { status, parentId, saEmail });
        
        if (status === 404 || status === 403) {
            throw new Error(`Parent folder not accessible (API Status: ${status}). Please verify that GOOGLE_DRIVE_PARENT_FOLDER_ID is correct and that the folder is shared with the service account email "${saEmail}" as an "Editor".`);
        }
        throw new Error(`Failed to access parent folder. Ensure it exists and the service account has permissions. API Status: ${status}`);
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
  
  try {
    console.log(`[Google Drive] Creating folder for order: ${orderId}, parent folder: ${parentFolderId}`);
    
    const { drive, saEmail } = getDriveClient();
    console.log(`[Google Drive] Drive client created for service account: ${saEmail}`);
    
    await verifyParentFolderAccess(drive, parentFolderId, saEmail);
    console.log(`[Google Drive] Parent folder access verified`);

    const fileMetadata = {
      name: `Order_${orderId}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    console.log(`[Google Drive] Creating folder with metadata:`, fileMetadata);
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });
    
    const folderId = folder.data.id!;
    console.log(`[Google Drive] Folder created successfully with ID: ${folderId}`);
    
    return folderId;
  } catch (error) {
    console.error(`[Google Drive] Failed to create folder for order ${orderId}:`, error);
    // If it's one of our specific verification errors, just re-throw it.
    if (error instanceof Error && (error.message.includes('(API Status: 404)') || error.message.includes('(API Status: 403)'))) {
        throw error;
    }
    // Otherwise, wrap it in the generic handler.
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
    console.log(`[Google Drive] Starting upload for file: ${fileData.name}, size: ${fileData.data.length} bytes, folder: ${folderId}`);
    
    const fileMetadata = {
      name: fileData.name,
      parents: [folderId],
    };

    const media = {
      mimeType: fileData.type,
      body: Readable.from(Buffer.from(new Uint8Array(fileData.data))),
    };

    console.log(`[Google Drive] Creating file with metadata:`, fileMetadata);
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

    console.log(`[Google Drive] File uploaded successfully with ID: ${fileId}`);

    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });
      console.log(`[Google Drive] Public permissions set for file: ${fileId}`);
    } catch (permError: any) {
      console.warn(
        `Warning: Could not set public permissions for file "${fileData.name}" (ID: ${fileId}). This may be due to shared drive policies. The file was still uploaded successfully.`,
        permError.message
      );
    }
    
    const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    console.log(`[Google Drive] Upload complete for ${fileData.name}, webViewLink: ${webViewLink}`);

    return { id: fileId, webViewLink };

  } catch (error) {
    console.error(`[Google Drive] Upload failed for ${fileData.name}:`, error);
    throw handleGoogleApiError(error, `uploading file "${fileData.name}"`);
  }
}

/**
 * Test result interface for Google Drive setup validation
 */
export interface TestResult {
  name: string;
  success: boolean;
  message: string;
}

/**
 * Comprehensive test function to validate Google Drive setup
 * @returns {Promise<TestResult[]>} Array of test results
 */
export async function testGoogleDriveSetup(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Test 1: Environment Variables
  try {
    const hasParentFolder = !!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    const hasJsonCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const hasEmailCreds = !!process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const hasKeyCreds = !!process.env.GOOGLE_DRIVE_PRIVATE_KEY;
    
    if (!hasParentFolder) {
      results.push({
        name: 'Environment Variables - Parent Folder ID',
        success: false,
        message: 'GOOGLE_DRIVE_PARENT_FOLDER_ID is not set'
      });
    } else {
      results.push({
        name: 'Environment Variables - Parent Folder ID',
        success: true,
        message: 'GOOGLE_DRIVE_PARENT_FOLDER_ID is configured'
      });
    }
    
    if (!hasJsonCreds && (!hasEmailCreds || !hasKeyCreds)) {
      results.push({
        name: 'Environment Variables - Credentials',
        success: false,
        message: 'No valid credential configuration found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY'
      });
    } else {
      results.push({
        name: 'Environment Variables - Credentials',
        success: true,
        message: hasJsonCreds ? 'JSON credentials configured' : 'Email/Key credentials configured'
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Environment Variables',
      success: false,
      message: `Error checking environment variables: ${error.message}`
    });
  }
  
  // Test 2: Credential Validation
  try {
    const credentials = getCredentials();
    results.push({
      name: 'Credential Validation',
      success: true,
      message: `Credentials loaded successfully for service account: ${credentials.client_email}`
    });
  } catch (error: any) {
    results.push({
      name: 'Credential Validation',
      success: false,
      message: `Credential validation failed: ${error.message}`
    });
    return results; // Can't proceed without valid credentials
  }
  
  // Test 3: Google Drive API Client
  try {
    const { drive, saEmail } = getDriveClient();
    results.push({
      name: 'Google Drive API Client',
      success: true,
      message: `Drive client created successfully for service account: ${saEmail}`
    });
  } catch (error: any) {
    results.push({
      name: 'Google Drive API Client',
      success: false,
      message: `Failed to create Drive client: ${error.message}`
    });
    return results; // Can't proceed without valid client
  }
  
  // Test 4: Parent Folder Access
  try {
    const { drive, saEmail } = getDriveClient();
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;
    await verifyParentFolderAccess(drive, parentFolderId, saEmail);
    results.push({
      name: 'Parent Folder Access',
      success: true,
      message: `Successfully accessed parent folder: ${parentFolderId}`
    });
  } catch (error: any) {
    results.push({
      name: 'Parent Folder Access',
      success: false,
      message: `Failed to access parent folder: ${error.message}`
    });
  }
  
  // Test 5: Test Folder Creation
  try {
    const testFolderId = await createOrderFolder('test-' + Date.now());
    results.push({
      name: 'Test Folder Creation',
      success: true,
      message: `Test folder created successfully with ID: ${testFolderId}`
    });
  } catch (error: any) {
    results.push({
      name: 'Test Folder Creation',
      success: false,
      message: `Failed to create test folder: ${error.message}`
    });
  }
  
  // Test 6: Test File Upload
  try {
    const testFolderId = await createOrderFolder('upload-test-' + Date.now());
    const testFile: SerializableFile = {
      name: 'test-file.txt',
      type: 'text/plain',
      size: 13,
      data: Array.from(new TextEncoder().encode('Hello, World!'))
    };
    
    const uploadResult = await uploadFileToDrive(testFile, testFolderId);
    results.push({
      name: 'Test File Upload',
      success: true,
      message: `Test file uploaded successfully. ID: ${uploadResult.id}, Link: ${uploadResult.webViewLink}`
    });
  } catch (error: any) {
    results.push({
      name: 'Test File Upload',
      success: false,
      message: `Failed to upload test file: ${error.message}`
    });
  }
  
  return results;
}
