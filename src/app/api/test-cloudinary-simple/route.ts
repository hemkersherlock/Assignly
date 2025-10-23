import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== SIMPLE CLOUDINARY TEST ===');
    console.log('Cloudinary config check:');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
    
    return NextResponse.json({
      success: true,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key_set: !!process.env.CLOUDINARY_API_KEY,
      api_secret_set: !!process.env.CLOUDINARY_API_SECRET
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

