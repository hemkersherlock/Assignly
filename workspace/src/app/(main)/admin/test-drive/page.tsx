"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import type { TestResult } from '@/lib/google-drive';

const ChecklistItem = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-500 mt-1 shrink-0" />
        <span>{children}</span>
    </li>
);

export default function TestGoogleDrivePage() {
    const [results, setResults] = useState<TestResult[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const response = await fetch('/api/test-google-drive');
            const data = await response.json();

            if (!response.ok) {
                 if (data.results && data.results.length > 0) {
                    setResults(data.results);
                 } else {
                    setError(data.message || 'An unknown error occurred during testing.');
                 }
            } else {
                 setResults(data.results);
            }
        } catch (err: any) {
            setError('Failed to connect to the server. Please check your network connection.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-subtle">
                    <CardHeader>
                        <CardTitle>Google Drive Integration Test</CardTitle>
                        <CardDescription>
                            Click the button to run a series of tests to ensure your Google Drive integration is configured correctly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleTest} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Running Tests...
                                </>
                            ) : 'Start Diagnostic Test'}
                        </Button>
                    </CardContent>
                </Card>

                {isLoading && (
                     <Card className="shadow-subtle animate-pulse">
                        <CardHeader><CardTitle>Test Results</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="h-8 w-1/2 bg-muted rounded-md"></div>
                            <div className="h-8 w-3/4 bg-muted rounded-md"></div>
                            <div className="h-8 w-2/3 bg-muted rounded-md"></div>
                        </CardContent>
                    </Card>
                )}

                {results && (
                     <Card className="shadow-subtle">
                        <CardHeader><CardTitle>Test Results</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {results.map((result) => (
                                    <li key={result.name} className="flex items-start gap-4 p-4 rounded-md border"
                                        style={{
                                            backgroundColor: result.success ? 'hsl(var(--success) / 0.05)' : 'hsl(var(--destructive) / 0.05)',
                                            borderColor: result.success ? 'hsl(var(--success) / 0.2)' : 'hsl(var(--destructive) / 0.2)',
                                        }}>
                                        {result.success ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 mt-1 shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{result.name}</h3>
                                            <p className="text-sm text-muted-foreground">{result.message}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                 {error && (
                    <Card className="shadow-subtle border-destructive">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                                <CardTitle className="text-destructive">Critical Error</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p>{error}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="lg:col-span-1 space-y-6 sticky top-24">
                 <Card className="shadow-subtle">
                    <CardHeader>
                        <CardTitle>Troubleshooting Checklist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4 text-sm text-muted-foreground">
                           <ChecklistItem>
                                **Google Drive API is enabled** in your Google Cloud Project.
                           </ChecklistItem>
                           <ChecklistItem>
                                **Service Account created** and has a valid JSON key.
                           </ChecklistItem>
                           <ChecklistItem>
                                The **`GOOGLE_DRIVE_PARENT_FOLDER_ID`** environment variable is correct.
                           </ChecklistItem>
                           <ChecklistItem>
                                The Parent Folder has been **shared with the Service Account email** as an **Editor**.
                           </ChecklistItem>
                           <ChecklistItem>
                                The **environment variables** (`GOOGLE_APPLICATION_CREDENTIALS_JSON`, etc.) are correctly set in your deployment environment.
                           </ChecklistItem>
                           <ChecklistItem>
                                You **restarted the server** after changing `.env` variables.
                           </ChecklistItem>
                        </ul>
                         <Button asChild variant="outline" className="w-full mt-6">
                            <a href="/GOOGLE_DRIVE_SETUP.md" target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Full Setup Guide
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
