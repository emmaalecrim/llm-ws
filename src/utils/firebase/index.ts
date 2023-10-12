import { initializeApp, cert, Credential, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { config } from 'dotenv';
import logger from "../logging";
import { Feedback } from "../schemas/feedback"


config();
// In your .env, set these two variables
// GOOGLE_CLOUD_PROJECT=truenation-dev
// GOOGLE_APPLICATION_CREDENTIALS=truenation-dev-6b80d0c98966.json
const isDev = process.env.NODE_ENV === "development"
const cred: Credential = isDev ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS || "") : applicationDefault()
const app = initializeApp({
    credential: cred,
});

console.info("Firebase Admin SDK initialized", app.name);

const firestore = getFirestore(app);

console.info("Firestore initialized");

const auth = getAuth(app)

console.info("Auth initialized");

export const getIdFromToken = async (token: string) => auth?.verifyIdToken(token)
export const checkSubscriptionStatus = (uid: string) => firestore.collection('users').doc(uid).get().then((snap) => snap.data()?.subscribed || false)
export const getAuthUser = (uid: string) => auth.getUser(uid).catch((e) => logger(`Error in auth.getUser: ${e.message}`, "error"))
export const getUserData = (uid: string) => firestore.collection('users').doc(uid).get().then((snap) => snap?.data()).catch((e) => logger(`Error in db.collection('users').doc(${uid}).get(): ${e.message}`, "error"))
export const saveFeedBack = (feedback: Feedback) => firestore.collection('feedback').add({ ...feedback, date: FieldValue.serverTimestamp() }).catch((e) => logger(`Error in db.collection('feedback').add(${feedback}): ${e.message}`, "error"))

export { app, firestore, auth };
