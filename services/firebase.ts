import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase safely
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.error("Firebase App initialization failed, retrying:", e);
  app = initializeApp(firebaseConfig);
}

export const auth = getAuth(app);

// Initialize Firestore safely with persistent local cache
let firestoreDb: any = null;
try {
  const customDbId = firebaseConfig && firebaseConfig.firestoreDatabaseId ? firebaseConfig.firestoreDatabaseId : undefined;
  
  if (customDbId) {
    try {
      firestoreDb = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, customDbId);
      console.log("Firestore initialized with persistent cache & custom database ID:", customDbId);
    } catch (initErr) {
      firestoreDb = getFirestore(app, customDbId);
      console.log("Firestore initialized with fallback custom database ID:", customDbId);
    }
  } else {
    try {
      firestoreDb = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
      console.log("Firestore initialized with persistent cache");
    } catch (initErr) {
      firestoreDb = getFirestore(app);
      console.log("Firestore initialized with default settings");
    }
  }
} catch (e) {
  console.warn("Firestore custom initialization warning, falling back to standard getFirestore:", e);
  try {
    if (firebaseConfig && firebaseConfig.firestoreDatabaseId) {
      firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      firestoreDb = getFirestore(app);
    }
  } catch (err2) {
    console.error("Default Firestore initialization failed too:", err2);
  }
}

export const db = firestoreDb;
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
storage.maxOperationRetryTime = 3000;
storage.maxUploadRetryTime = 3000;

export default app;

