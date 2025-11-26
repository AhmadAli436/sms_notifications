import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let firebaseAdmin = null;

export function initializeFirebase() {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Check if Firebase credentials are provided via environment variables
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    // Parse service account (can be JSON string or path to JSON file)
    let credentials;
    try {
      credentials = JSON.parse(serviceAccount);
    } catch {
      // If not JSON, treat as file path
      const fs = require('fs');
      const path = require('path');
      const serviceAccountPath = path.resolve(process.cwd(), serviceAccount);
      credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });

    console.log('✅ Firebase Admin initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    throw error;
  }
}

export function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    return initializeFirebase();
  }
  return firebaseAdmin;
}

export default getFirebaseAdmin;

