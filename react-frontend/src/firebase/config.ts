import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD99DP_Ji_w2md_UuJfwQJQfEQEV3VFIrY",
  authDomain: "fracestate-2c4bd.firebaseapp.com",
  projectId: "fracestate-2c4bd",
  storageBucket: "fracestate-2c4bd.firebasestorage.app",
  messagingSenderId: "453116630561",
  appId: "1:453116630561:web:d64f5a3c10a9b8018a3560",
  measurementId: "G-EX6TFRXSPE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);

export default app;