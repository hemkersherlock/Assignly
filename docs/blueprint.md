# **App Name**: Assignly

## Core Features:

- File Upload and Processing: Allows students to upload assignments (PDF, DOCX, images). A Cloud Function automatically processes the file to determine page count.
- Quota Management: Tracks and deducts page quotas from student accounts upon order submission using Firestore transactions to ensure atomicity.
- Admin Order Management: Provides an interface for admins to manage orders, upload completed files, and add notes.
- Analytics Dashboard: Displays key analytics such as pending orders, turnaround time, and page volume using charts and visualizations.
- Quota Replenishment: Enables admins to replenish quotas for all students with a single click using a Cloud Function.
- PDF page scanner: Generates a file using the file processor and the page amount in the input PDF

## Style Guidelines:

- Primary color: Light blue (#3B82F6), evoking a friendly, trustworthy feeling.
- Background color: Soft near-white gray (#F9FAFB), providing a clean and unobtrusive backdrop.
- Accent color: Gentle green (#10B981) for success states and positive affirmations; creates strong contrast with background and primary.
- Font: 'Inter' sans-serif, used throughout the application for a modern and readable experience. Note: currently only Google Fonts are supported.
- Headings: FontWeight: 600, with body having FontWeight: 400.
- Left sidebar navigation with a fixed width of 240px. The main content area is card-based.
- Consistent spacing using Tailwind's spacing scale for padding and margins.