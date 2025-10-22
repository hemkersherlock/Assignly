import { NextResponse } from 'next/server';
import { testGoogleDriveSetup } from '@/lib/google-drive';

export async function POST() {
  try {
    const result = await testGoogleDriveSetup();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to test Google Drive setup',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}