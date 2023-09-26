import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({
    credential: cert(require('../../../truenation-dev-6b80d0c98966.json')),
});

console.info("Firebase Admin SDK initialized", app.name);

const firestore = getFirestore(app);

console.info("Firestore initialized");

const auth = getAuth(app)

console.info("Auth initialized");

const getIdFromToken = async (token: string) => auth?.verifyIdToken(token)

export { app, firestore, getIdFromToken, auth };
