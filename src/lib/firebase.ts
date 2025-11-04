import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDqAsiITYyPK9bTuGGz7aVBkZ7oLB2Kt3U",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "onlineaviator-aa5a7.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://onlineaviator-aa5a7-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "onlineaviator-aa5a7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "onlineaviator-aa5a7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "846906736070",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:846906736070:web:b477afe5790957131f06c7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0Y4WGQ5NLX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;
