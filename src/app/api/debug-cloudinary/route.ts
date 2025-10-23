import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    const { publicId } = await request.json();
    
    console.log('=== CLOUDINARY DEBUG ===');
    console.log('Testing deletion for public ID:', publicId);
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
    });

    // First, check if the file exists
    console.log('1. Checking if file exists...');
    try {
      const resource = await cloudinary.api.resource(publicId);
      console.log('File exists:', resource);
    } catch (error) {
      console.log('File does not exist or error:', error);
    }

    // Try to delete the file
    console.log('2. Attempting to delete file...');
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Deletion result:', result);

    // Check if file still exists
    console.log('3. Checking if file still exists after deletion...');
    try {
      const resource = await cloudinary.api.resource(publicId);
      console.log('File still exists:', resource);
    } catch (error) {
      console.log('File successfully deleted or not found:', error);
    }

    return NextResponse.json({
      success: true,
      publicId,
      deletionResult: result,
      message: 'Debug completed'
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Debug failed' 
      },
      { status: 500 }
    );
  }
}

