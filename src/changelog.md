# Changelog

This file will be updated with a log of all changes made to the application code.

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
