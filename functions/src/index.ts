import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Cloud Function to automatically update order status from pending to writing after 2.5 hours
export const updateOrderStatus = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Running order status update check...');
    
    try {
      const db = admin.firestore();
      const now = new Date();
      const twoAndHalfHoursAgo = new Date(now.getTime() - (2.5 * 60 * 60 * 1000));
      
      console.log(`Checking for orders created before: ${twoAndHalfHoursAgo.toISOString()}`);
      
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      let updatedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get orders for this user that are still pending
        const ordersSnapshot = await db
          .collection(`users/${userId}/orders`)
          .where('status', '==', 'pending')
          .get();
        
        for (const orderDoc of ordersSnapshot.docs) {
          const orderData = orderDoc.data();
          const createdAt = orderData.createdAt;
          
          if (createdAt) {
            const orderDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
            
            // Check if order is older than 2.5 hours
            if (orderDate < twoAndHalfHoursAgo) {
              console.log(`Updating order ${orderDoc.id} from pending to writing`);
              
              await orderDoc.ref.update({
                status: 'writing',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              
              updatedCount++;
            }
          }
        }
      }
      
      console.log(`Updated ${updatedCount} orders from pending to writing`);
      return { success: true, updatedCount };
      
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  });

// Optional: Manual trigger function for testing
export const manualOrderStatusUpdate = functions.https.onCall(async (data, context) => {
  // Check if user is admin (optional security check)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const db = admin.firestore();
    const now = new Date();
    const twoAndHalfHoursAgo = new Date(now.getTime() - (2.5 * 60 * 60 * 1000));
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let updatedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Get orders for this user that are still pending
      const ordersSnapshot = await db
        .collection(`users/${userId}/orders`)
        .where('status', '==', 'pending')
        .get();
      
      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data();
        const createdAt = orderData.createdAt;
        
        if (createdAt) {
          const orderDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          
          // Check if order is older than 2.5 hours
          if (orderDate < twoAndHalfHoursAgo) {
            await orderDoc.ref.update({
              status: 'writing',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            updatedCount++;
          }
        }
      }
    }
    
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error('Error in manual order status update:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update order status');
  }
});

