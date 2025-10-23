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
    
    console.log('=== SIMPLE DELETE TEST ===');
    console.log('Public ID:', publicId);
    
    // Try to delete with a simple approach
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Delete result:', result);
    
    return NextResponse.json({
      success: true,
      publicId: publicId,
      result: result
    });

  } catch (error) {
    console.error('Simple delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

