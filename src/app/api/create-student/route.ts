import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

// Generate a random password
function generatePassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    // Validate input
    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('Creating student account:', { email, name });

    const auth = getAuth();
    const db = getFirestore();

    // Generate password
    const password = generatePassword(12);
    console.log('Generated password for student');

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    console.log('Created Firebase Auth user:', userRecord.uid);

    // Create user document in Firestore
    const userData = {
      id: userRecord.uid,
      email: email,
      name: name,
      whatsappNo: '', // Empty to trigger onboarding
      section: '', // Empty to trigger onboarding
      year: '', // Empty to trigger onboarding
      sem: '', // Empty to trigger onboarding
      branch: '', // Empty to trigger onboarding
      role: 'student',
      creditsRemaining: 40, // Default 40 credits
      totalOrders: 0,
      totalPages: 0,
      isActive: true,
      createdAt: new Date(),
      lastOrderAt: null,
    };

    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('Created user document in Firestore');

    return NextResponse.json({
      success: true,
      message: 'Student account created successfully',
      student: {
        id: userRecord.uid,
        email: email,
        name: name,
        password: password, // Include password in response for admin to share
      }
    });

  } catch (error: any) {
    console.error('Error creating student:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }
    
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create student account' 
      },
      { status: 500 }
    );
  }
}
