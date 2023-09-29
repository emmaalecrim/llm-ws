import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

//cert(require('../../../truenation-dev-6b80d0c98966.json')) ||
const app = initializeApp({
    credential: applicationDefault(),
});

console.info("Firebase Admin SDK initialized", app.name);

const firestore = getFirestore(app);

console.info("Firestore initialized");

const auth = getAuth(app)

console.info("Auth initialized");

const getIdFromToken = async (token: string) => auth?.verifyIdToken(token)

export { app, firestore, getIdFromToken, auth };
