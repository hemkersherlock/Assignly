'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function TestDrivePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testGoogleDrive = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test-google-drive', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to test Google Drive setup',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Google Drive API Test</CardTitle>
          <CardDescription>
            Test your Google Drive API configuration to identify permission issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={testGoogleDrive} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Testing...' : 'Test Google Drive Setup'}
          </Button>

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="font-semibold">
                    {result.message}
                  </AlertDescription>
                  {result.details && (
                    <div className="mt-3 space-y-2">
                      <h4 className="font-medium text-sm">Details:</h4>
                      <pre className="text-xs bg-white/50 p-3 rounded border overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Common Issues & Solutions:</h3>
            
            <div className="grid gap-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Permission Denied (403):</strong> The service account needs to be shared with the parent folder as an "Editor" in Google Drive.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Not Found (404):</strong> Check that your GOOGLE_DRIVE_PARENT_FOLDER_ID is correct and the folder exists.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Authentication Failed (401):</strong> Verify your service account credentials are correct and the Google Drive API is enabled.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Setup Checklist:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Google Drive API is enabled in your GCP project
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Service account is created with proper permissions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Parent folder is shared with service account email as "Editor"
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Environment variables are properly set
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}