import { NextResponse } from 'next/server';
import { testGoogleDriveSetup, type TestResult } from '@/lib/google-drive';

export async function GET(request: Request) {
  try {
    const results = await testGoogleDriveSetup();
    const hasFailedTests = results.some(r => !r.success);

    return NextResponse.json({
        success: !hasFailedTests,
        results: results,
    }, {
        status: hasFailedTests ? 500 : 200,
    });

  } catch (error: any) {
    console.error("Critical error in Google Drive test API:", error);
    const results: TestResult[] = [{
        name: 'API Endpoint Error',
        success: false,
        message: error.message || 'An unknown server error occurred.',
    }];
    return NextResponse.json({
        success: false,
        results: results,
    }, {
        status: 500
    });
  }
}
