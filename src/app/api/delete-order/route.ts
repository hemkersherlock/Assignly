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

// Helper function to delete Cloudinary files
async function deleteCloudinaryFiles(originalFiles: any[], cloudinaryFolder?: string): Promise<boolean> {
  try {
    console.log('Starting Cloudinary cleanup...');
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
    });
    
    let allDeleted = true;
    
    // 1. Try to delete the entire folder first (most efficient)
    if (cloudinaryFolder) {
      console.log(`Attempting to delete Cloudinary folder: ${cloudinaryFolder}`);
      try {
        // First, let's see what's in the folder
        console.log(`Listing files in folder: ${cloudinaryFolder}`);
        try {
          const folderContents = await cloudinary.api.resources({
            type: 'upload',
            prefix: cloudinaryFolder
          });
          console.log('Folder contents:', folderContents);
        } catch (error) {
          console.warn('Could not list folder contents:', error);
        }
        
        const result = await cloudinary.api.delete_folder(cloudinaryFolder);
        console.log('Folder deletion result:', result);
        if (result.deleted && result.deleted.length > 0) {
          console.log(`Successfully deleted folder: ${cloudinaryFolder}`);
          return true;
        } else {
          console.warn(`Folder deletion returned no deleted files:`, result);
        }
      } catch (error) {
        console.warn(`Failed to delete folder ${cloudinaryFolder}:`, error);
        allDeleted = false;
      }
    }

    // 2. Delete individual files using the exact public IDs from Cloudinary API
    if (originalFiles && originalFiles.length > 0) {
      console.log(`Deleting ${originalFiles.length} individual files...`);
      
      // Get the exact public IDs from the folder listing
      let exactPublicIds = [];
      if (cloudinaryFolder) {
        try {
          const folderContents = await cloudinary.api.resources({
            type: 'upload',
            prefix: cloudinaryFolder
          });
          exactPublicIds = folderContents.resources.map(resource => resource.public_id);
          console.log('Exact public IDs from Cloudinary:', exactPublicIds);
        } catch (error) {
          console.warn('Could not get exact public IDs:', error);
        }
      }
      
      const deletePromises = originalFiles.map(async (file, index) => {
        try {
          console.log(`Processing file ${index + 1}: ${file.url}`);
          
          // Use exact public ID if available, otherwise try to extract from URL
          let publicId;
          if (exactPublicIds.length > 0 && exactPublicIds[index]) {
            publicId = exactPublicIds[index];
            console.log(`✅ Using exact public ID from Cloudinary: ${publicId}`);
          } else {
            // Fallback to URL parsing with better logic
            if (file.url.includes('cloudinary.com')) {
              const urlParts = file.url.split('/');
              const uploadIndex = urlParts.findIndex(part => part === 'upload');
              
              if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
                const pathParts = urlParts.slice(uploadIndex + 2);
                publicId = pathParts.join('/');
                
                // Fix double extension issue
                if (publicId.includes('.jpg.jpg')) {
                  publicId = publicId.replace('.jpg.jpg', '.jpg');
                  console.log(`Fixed double extension: ${publicId}`);
                }
                
                console.log(`Extracted public ID from URL: ${publicId}`);
              } else {
                console.warn(`Could not parse Cloudinary URL: ${file.url}`);
                return false;
              }
            } else {
              console.warn(`Invalid Cloudinary URL format: ${file.url}`);
              return false;
            }
          }
          
          // Fix double extension issue first
          if (publicId.includes('.jpg.jpg')) {
            publicId = publicId.replace('.jpg.jpg', '.jpg');
            console.log(`Fixed double extension, new public ID: ${publicId}`);
          }
          
          console.log(`Attempting to delete file with public ID: ${publicId}`);
          
          // Add timeout to prevent hanging
          const deletePromise = cloudinary.uploader.destroy(publicId);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cloudinary deletion timeout')), 10000)
          );
          
          let result = await Promise.race([deletePromise, timeoutPromise]);
          console.log(`File deletion result for ${publicId}:`, result);
          
          if (result.result === 'ok') {
            console.log(`✅ Successfully deleted: ${publicId}`);
            return true;
          } else {
            console.warn(`❌ Failed to delete: ${publicId}, result: ${result.result}`);
            
            // Try alternative public ID formats
            const orderId = publicId.split('/')[2]; // Extract order ID
            const fileName = publicId.split('/').pop(); // Extract filename
            const alternativeIds = [
              `assignly/orders/${orderId}/${fileName}`, // Correct format
              fileName, // Just the filename
              publicId.replace(`assignly/orders/${orderId}/assignly/orders/${orderId}/`, `assignly/orders/${orderId}/`), // Remove duplicate
              publicId.replace(`assignly/orders/${orderId}/`, ''), // Remove folder prefix
              publicId + '.jpg', // Add extension if missing
              publicId.replace('.jpg', '') // Remove extension
            ];
            
            for (const altId of alternativeIds) {
              if (altId !== publicId) {
                console.log(`Trying alternative public ID: ${altId}`);
                try {
                  result = await cloudinary.uploader.destroy(altId);
                  console.log(`Alternative deletion result for ${altId}:`, result);
                  if (result.result === 'ok') {
                    console.log(`✅ Successfully deleted with alternative ID: ${altId}`);
                    return true;
                  }
                } catch (error) {
                  console.warn(`Alternative ID ${altId} also failed:`, error);
                }
              }
            }
            
            return false;
          }
        } catch (error) {
          console.error(`❌ Error deleting file ${file.url}:`, error);
          return false;
        }
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(Boolean).length;
      console.log(`Deleted ${successCount}/${originalFiles.length} files`);
      
      if (successCount < originalFiles.length) {
        allDeleted = false;
      }
    } else {
      console.log('No original files provided for deletion');
    }

    return allDeleted;
  } catch (error) {
    console.error('Error in Cloudinary cleanup:', error);
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