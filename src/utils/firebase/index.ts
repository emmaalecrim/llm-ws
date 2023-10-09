import { initializeApp, cert, Credential, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { config } from 'dotenv';


config();
// In your .env, set these two variables
// GOOGLE_CLOUD_PROJECT=truenation-dev
// GOOGLE_APPLICATION_CREDENTIALS=truenation-dev-6b80d0c98966.json
const cred: Credential = (process.env.GOOGLE_APPLICATION_CREDENTIALS) ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) : applicationDefault()
const app = initializeApp({
    credential: cred,
});

console.info("Firebase Admin SDK initialized", app.name);

const firestore = getFirestore(app);

console.info("Firestore initialized");

const auth = getAuth(app)

console.info("Auth initialized");

const getIdFromToken = async (token: string) => auth?.verifyIdToken(token)

export { app, firestore, getIdFromToken, auth };
