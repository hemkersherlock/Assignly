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
    const { folder } = await request.json();
    
    console.log('=== LISTING CLOUDINARY FOLDER ===');
    console.log('Folder:', folder);
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder
    });
    
    console.log('Folder contents:', result);
    
    return NextResponse.json({
      success: true,
      folder: folder,
      resources: result.resources,
      count: result.resources.length
    });

  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

