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
    const { url } = await request.json();
    
    console.log('=== FORCE DELETE TEST ===');
    console.log('URL:', url);
    
    // Extract public ID from URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      return NextResponse.json({ success: false, error: 'Invalid Cloudinary URL' });
    }
    
    const pathParts = urlParts.slice(uploadIndex + 2);
    let publicId = pathParts.join('/');
    
    // Fix double extension
    if (publicId.includes('.jpg.jpg')) {
      publicId = publicId.replace('.jpg.jpg', '.jpg');
    }
    
    console.log('Extracted public ID:', publicId);
    
    // Try multiple variations
    const variations = [
      publicId,
      publicId.replace('.jpg', ''),
      publicId + '.jpg',
      publicId.replace('assignly/orders/vU2vmWYReAr8pBAOKXd4/assignly/orders/vU2vmWYReAr8pBAOKXd4/', 'assignly/orders/vU2vmWYReAr8pBAOKXd4/'),
      publicId.split('/').pop()
    ];
    
    console.log('Trying variations:', variations);
    
    for (const variation of variations) {
      console.log(`Trying: ${variation}`);
      try {
        const result = await cloudinary.uploader.destroy(variation);
        console.log(`Result for ${variation}:`, result);
        if (result.result === 'ok') {
          return NextResponse.json({ 
            success: true, 
            deleted: variation,
            result: result 
          });
        }
      } catch (error) {
        console.log(`Error for ${variation}:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'All variations failed',
      variations: variations 
    });

  } catch (error) {
    console.error('Force delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

