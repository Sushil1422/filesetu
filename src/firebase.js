// src/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database'; // Add this import

const firebaseConfig = {
  apiKey: "AIzaSyDEgCXNnqxyhwupjXglSivxjmqtXPTs1Ms",
  authDomain: "analysefiles.firebaseapp.com",
  databaseURL: "https://analysefiles-default-rtdb.firebaseio.com",
  projectId: "analysefiles",
  storageBucket: "analysefiles.firebasestorage.app",
  messagingSenderId: "436515745932",
  appId: "1:436515745932:web:1bbab619f87280a7004ba9",
  measurementId: "G-0EE2KGRX1H"
};


const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const database = getDatabase(app); // Add this export
