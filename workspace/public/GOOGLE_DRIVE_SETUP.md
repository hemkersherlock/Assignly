# Assignly: Google Drive Integration Setup

This guide provides a step-by-step process for correctly configuring the Google Drive API for the Assignly application. Following these steps is crucial for the file upload functionality to work correctly.

## Summary of Steps

1.  **Create a Google Cloud Project**: If you don't have one already.
2.  **Enable the Google Drive API**: For your Google Cloud project.
3.  **Create a Service Account**: This is a special account the application will use to interact with Google Drive.
4.  **Create a Service Account Key**: A JSON file containing the credentials for the service account.
5.  **Create a Parent Folder in Google Drive**: This is where all order files will be stored.
6.  **Share the Parent Folder**: With the service account, giving it "Editor" permissions.
7.  **Configure Environment Variables**: In the Assignly application.

---

## Step 1: Create a Google Cloud Project

- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- In the top bar, click the project selector and then click **"New Project"**.
- Give your project a name (e.g., "Assignly App") and click **"Create"**.

## Step 2: Enable the Google Drive API

- Make sure your new project is selected in the Google Cloud Console.
- In the search bar at the top, type "Google Drive API" and select it.
- Click the **"Enable"** button. If it's already enabled, you can move to the next step.

## Step 3: Create a Service Account

A service account is a special type of Google account intended to represent a non-human user that needs to authenticate and be authorized to access data in Google APIs.

- In the Google Cloud Console, navigate to **IAM & Admin > Service Accounts**.
- Click **"+ CREATE SERVICE ACCOUNT"** at the top.
- **Service account name**: Enter a name like `assignly-drive-manager`.
- **Service account ID**: This will be automatically generated.
- **Description**: Add a description like "Service account for Assignly app to manage Google Drive files."
- Click **"CREATE AND CONTINUE"**.
- **Grant this service account access to project**: You can skip this for now. Click **"CONTINUE"**.
- **Grant users access to this service account**: You can also skip this. Click **"DONE"**.

## Step 4: Create a Service Account Key

The key is a JSON file that contains the private credentials your application will use to authenticate. **Treat this file like a password and keep it secure.**

- Find the service account you just created in the list.
- Click the three-dot menu (Actions) on the right side and select **"Manage keys"**.
- Click **"ADD KEY"** and select **"Create new key"**.
- Choose **JSON** as the key type and click **"CREATE"**.
- A JSON file will be downloaded to your computer. **This is your only chance to download this file.**

## Step 5: Create a Parent Folder in Google Drive

This is the main folder where the application will create sub-folders for each order.

- Go to your personal or company Google Drive.
- Create a new folder. You can name it something like `Assignly Orders`.
- **Important**: If you are part of a Google Workspace organization, it's highly recommended to create this folder inside a **Shared Drive**. This can prevent ownership issues.

## Step 6: Share the Parent Folder with the Service Account

- Open the downloaded JSON key file from Step 4 in a text editor.
- Find the value associated with `"client_email"`. It will look like `...iam.gserviceaccount.com`. Copy this entire email address.
- Go back to Google Drive and right-click on the parent folder you created in Step 5.
- Click **Share**.
- In the "Add people and groups" field, paste the service account's `client_email` address.
- Make sure to set the role to **Editor**. This is required for the app to be able to create new folders and upload files.
- Uncheck "Notify people" and click **Share**.

## Step 7: Configure Environment Variables

Now you need to provide the credentials and folder ID to the Assignly application.

- **Get the Parent Folder ID**:
    - Open the parent folder in Google Drive.
    - Look at the URL in your browser's address bar. It will be something like `https://drive.google.com/drive/folders/LONG_STRING_OF_CHARACTERS`.
    - The `LONG_STRING_OF_CHARACTERS` is your folder ID. Copy it.

- **Set the Environment Variables**:
    - Open the `.env` file in the Assignly project.
    - You have two options for credentials:

    **Option 1 (Recommended): Use the full JSON**
    - Open the JSON key file you downloaded.
    - Copy the **entire contents** of the file.
    - Set the `GOOGLE_APPLICATION_CREDENTIALS_JSON` variable. It should look like this (all on one line):
      ```
      GOOGLE_APPLICATION_CREDENTIALS_JSON={"type": "service_account", "project_id": "...", ...}
      ```

    **Option 2: Use separate email and private key**
    - From the JSON key file, copy the `client_email` and the entire `private_key` (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`).
    - Set the variables like this, making sure to wrap the key in double quotes:
      ```
      GOOGLE_DRIVE_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
      GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMI...=\n-----END PRIVATE KEY-----\n"
      ```

    - Finally, set the parent folder ID you copied:
      ```
      GOOGLE_DRIVE_PARENT_FOLDER_ID="YOUR_FOLDER_ID_HERE"
      ```

- **Restart the Application**: After saving the `.env` file, you must restart the application server for the changes to take effect.

---

### Troubleshooting

After setting up, go to the **Admin Dashboard > Test Drive** page to diagnose any issues. The tests on that page will give you specific feedback on what might be wrong.
