# Google Drive API Setup Guide

This guide will help you resolve the "Permission denied" error with Google Drive API integration.

## Quick Diagnosis

1. **Visit the test page**: Go to `/admin/test-drive` in your application
2. **Click "Test Google Drive Setup"** to run diagnostics
3. **Follow the specific error message** to fix the issue

## Step-by-Step Setup

### 1. Enable Google Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Drive API"
5. Click on it and press **"Enable"**

### 2. Create Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **"Create Credentials"** > **"Service Account"**
3. Fill in the details:
   - **Name**: `assignly-drive-service`
   - **Description**: `Service account for Assignly Google Drive integration`
4. Click **"Create and Continue"**
5. Skip the role assignment (click **"Continue"**)
6. Click **"Done"**

### 3. Generate Service Account Key

1. In the **Credentials** page, find your service account
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** > **"Create new key"**
5. Choose **"JSON"** format
6. Click **"Create"** - this will download a JSON file

### 4. Set Up Environment Variables

Create a `.env.local` file in your project root with:

```bash
# Option 1: Use the entire JSON file (base64 encoded)
GOOGLE_APPLICATION_CREDENTIALS_JSON="eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Iiwi..."

# Option 2: Use individual fields
GOOGLE_DRIVE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Required: Parent folder ID where files will be stored
GOOGLE_DRIVE_PARENT_FOLDER_ID="1ABC123DEF456GHI789JKL"
```

**To get the parent folder ID:**
1. Go to [Google Drive](https://drive.google.com/)
2. Create a folder called "Assignly Orders" (or any name)
3. Open the folder
4. Copy the ID from the URL: `https://drive.google.com/drive/folders/1ABC123DEF456GHI789JKL`

### 5. Share Folder with Service Account

**This is the most common cause of permission errors!**

1. Right-click on your parent folder in Google Drive
2. Select **"Share"**
3. Add the service account email (from step 3) as a collaborator
4. Set permission to **"Editor"**
5. Click **"Send"**

### 6. Verify Setup

1. Restart your development server: `npm run dev`
2. Go to `/admin/test-drive` in your application
3. Click **"Test Google Drive Setup"**
4. You should see a success message

## Common Issues & Solutions

### Error: "Permission denied. Please ensure the Google Drive API is enabled..."

**Solution:**
1. Verify Google Drive API is enabled in GCP Console
2. Check that the parent folder is shared with the service account as "Editor"
3. Ensure the service account email is correct

### Error: "Resource not found (404)"

**Solution:**
1. Verify `GOOGLE_DRIVE_PARENT_FOLDER_ID` is correct
2. Make sure the folder exists and is not in trash
3. Check that the folder ID is from the URL, not the folder name

### Error: "Authentication failed (401)"

**Solution:**
1. Verify your service account credentials are correct
2. Check that the JSON key file is properly formatted
3. Ensure environment variables are loaded correctly

### Error: "Insufficient authentication scopes"

**Solution:**
1. The service account needs the Google Drive API scope
2. This is usually handled automatically when you enable the API
3. If the issue persists, try recreating the service account

## Environment Variable Formats

### Option 1: JSON (Recommended)
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40project.iam.gserviceaccount.com"}'
```

### Option 2: Base64 Encoded JSON
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON="eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Iiwi..."
```

### Option 3: Individual Fields
```bash
GOOGLE_DRIVE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

## Testing Your Setup

After completing the setup:

1. **Run the diagnostic test** at `/admin/test-drive`
2. **Try creating a new order** with file uploads
3. **Check the browser console** for any error messages
4. **Verify files appear** in your Google Drive folder

## Troubleshooting

If you're still having issues:

1. **Check the logs** in your terminal for detailed error messages
2. **Verify all environment variables** are set correctly
3. **Test with a simple folder** first (not a shared drive)
4. **Ensure the service account** has the correct permissions
5. **Try recreating the service account** if all else fails

## Security Notes

- Never commit your service account key to version control
- Use environment variables for all sensitive data
- Regularly rotate your service account keys
- Limit the service account permissions to only what's needed