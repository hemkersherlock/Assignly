# Changelog

This file will be updated with a log of all changes made to the application code.

## [2024-07-26] - Definitive Fix for Server Action Serialization
- **This is the correct and final fix.**
- Resolved the critical `Uint8Array objects are not supported` error by correctly implementing file serialization.
- The client-side code on the "New Order" page now converts `File` objects into a serializable plain object (with file data converted to a `number[]` array) **before** sending them to the server action.
- The `uploadFileToDrive` server action was updated to accept this serializable object and correctly reconstruct the file `Buffer` on the server before streaming it to Google Drive.
- This resolves the long-standing issue where `File` objects were being passed directly to server actions, causing repeated failures.

## [2024-07-26] - Fix Critical Authentication Failure for New Users
- Corrected Firestore security rules to allow a newly authenticated user to create their own user profile document. This resolves the "Missing or insufficient permissions" error that was blocking all new student sign-ups. The `create` rule for the `/users/{userId}` path was fixed to ensure the initial profile creation from the client is permitted.

## [2024-07-26] - Isolate Firebase and Google Drive Authentication
- Refactored the Google Drive integration to be strictly server-side, preventing conflicts with client-side Firebase Authentication. The order creation flow now correctly uses these server actions.
- Added necessary environment variables to support the server-side Google Drive configuration.

## [2024-07-26] - Step 1: Connect App to Firebase
- Added `FirebaseClientProvider` to `src/app/layout.tsx` to initialize Firebase services.
- Replaced the mock authentication system in `AuthContext` with a real one using Firebase Authentication and Firestore.
- The app now listens for real-time authentication state changes and fetches user profiles from the Firestore database.

## [2024-07-26] - Revert to Mock Data
- Reverted all Firebase-related changes to restore the application to a stable, working state using the original mock data system. This was done to recover from a series of failed attempts to integrate a real backend.

## [2024-07-26] - Fix `auth/invalid-credential` Error on Login
- Updated the login page to automatically create user accounts (`student@assignly.com`, `admin@assignly.com`) if they don't already exist in Firebase Authentication. This resolves the `auth/invalid-credential` error during the first sign-in attempt.

## [2024-07-26] - Fix "Authentication service not available" Error
- Corrected an issue on the login page where the Firebase Authentication service was not being properly initialized, which caused a login failure. The page now correctly uses the `useFirebase` hook to get the auth instance.

## [2024-07-26] - Switch to Firebase Storage for File Uploads
- Reverted the previous Google Drive integration plan.
- Removed `googleapis` from `package.json` and cleared `.env` file.
- Chose Firebase Storage as the definitive solution for file uploads due to its superior security and integration capabilities for web applications.

## [2024-07-26] - Fix infinite render loop on New Order page
- Resolved a "Maximum update depth exceeded" error by optimizing the `useEffect` hook responsible for PDF page counting. The logic is now correctly memoized to prevent unnecessary re-renders.

## [2024-07-26] - Implement Accurate PDF Page Counting
- Added `pdfjs-dist` library to the project.
- Updated the "New Order" page to count the exact number of pages for uploaded PDF files.
- Files other than PDFs are counted as a single page. This significantly improves the accuracy of the billing summary.

## [2024-`07-26`] - Update page counting logic on New Order page
- Changed the page counting logic to count each uploaded file as one page. This is a temporary, more predictable solution until proper server-side page counting can be implemented.

## [2024-07-26] - Add Order Type Selection
- Added a radio button group on the "New Order" page for users to select between "Assignment" and "Practical".
- Updated the `Order` type in `src/types/index.ts` to include an `orderType` field.
- Updated `src/lib/mock-data.ts` to reflect the new `orderType` field in mock orders.

## [2024-07-26] - Fix `React is not defined` error on New Order page
- Added the missing `useRef` import from `react` to resolve a runtime error.

## [2024-07-26] - Refine file upload UI on New Order page
- Replaced the persistent drag-and-drop area with a grid of file previews that appears after the first file is uploaded.
- Added an "Add More" button with a `+` icon to allow for adding more files, creating a cleaner and more intuitive user flow.
- Added image previews for uploaded image files.

## [2024-07-25] - Redesign New Order Page and Update Navigation
- Redesigned the "New Order" page with a modern, two-column layout.
- Implemented multi-file upload with drag-and-drop support.
- Added a field for an assignment title.
- Created a "Billing Summary" card that dynamically calculates page counts and updates the user's quota information in real-time.
- Updated the student sidebar navigation to move "New Order" to a more prominent position below "Dashboard".

## [2024-07-25] - Fix Next.js Link `legacyBehavior` deprecation
- Removed `legacyBehavior` prop from `Link` component in `src/components/layout/AppShell.tsx` and updated component structure to align with modern Next.js practices.

## [2024-07-25] - Fix admin dashboard chart tooltip error
- Replaced `recharts` `Tooltip` with `ChartTooltip` and `ChartTooltipContent` from `shadcn/ui` to fix a context-related rendering error in the admin dashboard chart.
- Added a `ChartContainer` to provide the necessary context for the chart components.

## [2024-07-25] - Fix admin dashboard SSR error
- Added `'use client'` to `src/app/(main)/admin/page.tsx` to fix a server-side rendering issue with the recharts library.
- Corrected a calculation for `avgTurnaround` to prevent division by zero.

## [YYYY-MM-DD] - Initial Setup
- Created `changelog.md` to track codebase modifications.
