import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Helper function to delete Cloudinary files using Admin API
async function deleteCloudinaryFiles(originalFiles: any[], cloudinaryFolder?: string): Promise<boolean> {
  try {
    console.log('🧹 Starting Cloudinary cleanup...');
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
    });
    
    if (!cloudinaryFolder) {
      console.log('No cloudinary folder provided');
      return true;
    }

    // Use Admin API to get ALL resources in the folder
    console.log(`📁 Listing all resources in folder: ${cloudinaryFolder}`);
    
    const folderContents = await cloudinary.api.resources({
      type: 'upload',
      prefix: cloudinaryFolder,
      max_results: 500 // Get up to 500 resources
    });
    
    console.log(`📋 Found ${folderContents.resources?.length || 0} resources in folder`);
    
    if (!folderContents.resources || folderContents.resources.length === 0) {
      console.log('📁 Folder is already empty');
      return true;
    }
    
    // Log all found resources
    folderContents.resources.forEach((resource: any, index: number) => {
      console.log(`Resource ${index + 1}: ${resource.public_id} (${resource.format})`);
    });
    
    // Delete all resources found in the folder
    console.log('🗑️ Deleting all resources...');
    
    const deletePromises = folderContents.resources.map(async (resource: any) => {
      try {
        console.log(`Deleting: ${resource.public_id}`);
        const result = await cloudinary.uploader.destroy(resource.public_id);
        console.log(`✅ Deleted: ${resource.public_id} - ${result.result}`);
        return result.result === 'ok';
      } catch (error) {
        console.error(`❌ Failed to delete ${resource.public_id}:`, error);
        return false;
      }
    });
    
    const results = await Promise.all(deletePromises);
    const successCount = results.filter(Boolean).length;
    console.log(`🎉 Successfully deleted ${successCount}/${folderContents.resources.length} files`);
    
    // Try to delete the folder itself
    try {
      console.log('📁 Attempting to delete folder...');
      const folderResult = await cloudinary.api.delete_folder(cloudinaryFolder);
      console.log('📁 Folder deletion result:', folderResult);
    } catch (folderError) {
      console.log('📁 Folder deletion failed (may already be empty):', folderError);
    }
    
    return successCount === folderContents.resources.length;
    
  } catch (error) {
    console.error('❌ Error during Cloudinary cleanup:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const db = getFirestore();
  const batch = db.batch();

  try {
    const { orderId, studentId, pageCount, originalFiles, cloudinaryFolder } = await request.json();

    console.log('Starting order deletion process:', { orderId, studentId, pageCount });

    // Validate input
    if (!orderId || !studentId || typeof pageCount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid input parameters' },
        { status: 400 }
      );
    }

    // 1. Get current user data for credit restoration
    const userRef = db.collection('users').doc(studentId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentCredits = userData?.creditsRemaining || 0;
    const currentTotalOrders = userData?.totalOrders || 0;
    const currentTotalPages = userData?.totalPages || 0;

    console.log('Current user stats:', { currentCredits, currentTotalOrders, currentTotalPages });

    // 2. Delete Cloudinary files first (before deleting order)
    let cloudinaryDeleted = true;
    if (originalFiles && originalFiles.length > 0) {
      console.log('Cleaning up Cloudinary files...');
      console.log('Files to delete:', originalFiles.map(f => f.url));
      console.log('Cloudinary folder:', cloudinaryFolder);
      
      cloudinaryDeleted = await deleteCloudinaryFiles(originalFiles, cloudinaryFolder);
      if (!cloudinaryDeleted) {
        console.warn('❌ Some Cloudinary files may not have been deleted');
      } else {
        console.log('✅ All Cloudinary files deleted successfully');
      }
    } else {
      console.log('No Cloudinary files to delete');
    }

    // 3. Delete the order document
    const orderRef = db.collection(`users/${studentId}/orders`).doc(orderId);
    batch.delete(orderRef);
    console.log('Order document marked for deletion');

    // 4. Restore student credits and update stats
    const newCredits = currentCredits + pageCount;
    const newTotalOrders = Math.max(0, currentTotalOrders - 1);
    const newTotalPages = Math.max(0, currentTotalPages - pageCount);

    batch.update(userRef, {
      creditsRemaining: newCredits,
      totalOrders: newTotalOrders,
      totalPages: newTotalPages,
    });

    console.log('User stats update prepared:', { newCredits, newTotalOrders, newTotalPages });

    // 5. Commit all changes in a transaction
    await batch.commit();
    console.log('Transaction committed successfully');

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
      cloudinaryDeleted,
      creditsRestored: pageCount,
      newUserStats: {
        creditsRemaining: newCredits,
        totalOrders: newTotalOrders,
        totalPages: newTotalPages,
      }
    });

  } catch (error) {
    console.error('Error in delete order API:', error);
    
    // If batch was started, try to rollback (though Firestore doesn't support rollback)
    // The transaction will automatically fail if any operation fails
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete order' 
      },
      { status: 500 }
    );
  }
}