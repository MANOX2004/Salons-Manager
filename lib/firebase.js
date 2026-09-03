import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Main app - normal login/signup/session eka mekenma
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary app - super-admin kenek admin account ekak hadanakota
// eyage own login session eka logout karanne nathuwa aluth account eka
// hadaganna me trick eka one wenawa (Cloud Functions / billing account eka
// nathuwama client side ma karanna puluwan widiyata)
export function getSecondaryAuth() {
  const secondaryApp = getApps().find((a) => a.name === "Secondary")
    ? getApp("Secondary")
    : initializeApp(firebaseConfig, "Secondary");
  return getAuth(secondaryApp);
}
