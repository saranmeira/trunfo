import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getDatabase(app);
export const auth = getAuth(app);

// Always use emulators in development
if (import.meta.env.DEV) {
  console.log('🔥 Connecting to Firebase Emulators...');
  
  // Connect to database emulator
  try {
    connectDatabaseEmulator(db, 'localhost', 9000);
    console.log('✅ Database emulator connected on port 9000');
  } catch (error) {
    if (error.message?.includes('already been initialized')) {
      console.log('✅ Database emulator already connected');
    } else {
      console.warn('⚠️ Database emulator connection failed:', error);
    }
  }
}