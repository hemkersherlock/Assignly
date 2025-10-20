# Changelog

This file will be updated with a log of all changes made to the application code.

## [2024-07-25] - Fix admin dashboard chart tooltip error
- Replaced `recharts` `Tooltip` with `ChartTooltip` and `ChartTooltipContent` from `shadcn/ui` to fix a context-related rendering error in the admin dashboard chart.
- Added a `ChartContainer` to provide the necessary context for the chart components.

## [2024-07-25] - Fix admin dashboard SSR error
- Added `'use client'` to `src/app/(main)/admin/page.tsx` to fix a server-side rendering issue with the recharts library.
- Corrected a calculation for `avgTurnaround` to prevent division by zero.

## [YYYY-MM-DD] - Initial Setup
- Created `changelog.md` to track codebase modifications.
