# Changelog

This file will be updated with a log of all changes made to the application code.

## [2024-07-26] - Prepare for Google Drive Integration
- Added `next-auth` and `googleapis` packages to `package.json`.
- Created placeholder environment variables in `.env` for Google OAuth credentials. This lays the groundwork for connecting to Google Drive.

## [2024-07-26] - Fix infinite render loop on New Order page
- Resolved a "Maximum update depth exceeded" error by optimizing the `useEffect` hook responsible for PDF page counting. The logic is now correctly memoized to prevent unnecessary re-renders.

## [2024-07-26] - Implement Accurate PDF Page Counting
- Added `pdfjs-dist` library to the project.
- Updated the "New Order" page to count the exact number of pages for uploaded PDF files.
- Files other than PDFs are counted as a single page. This significantly improves the accuracy of the billing summary.

## [2024-07-26] - Update page counting logic on New Order page
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

    

    
