import { NextFunction, Request } from 'express'
import jwt from 'jsonwebtoken'
import { config } from 'dotenv';
import { getIdFromToken, checkSubscriptionStatus } from '../firebase';
import logger from '../logging';


config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
// const JWT_EXPIRATION = '2weeks';

export type Claims = {
    uid: string,
    sub: string,
    isSub: boolean
}

export interface AuthenticatedRequest extends Request {
    claims: Claims
}


async function authenticate(req: Request, res: any, next: NextFunction) {
    try {
        const token: string = req?.headers?.["sec-websocket-protocol"] || req?.header('Authorization')?.split(' ')[1] || "";
        const claims = jwt.verify(token, JWT_SECRET) as Claims
        // @ts-ignore - claims is not a property of Request
        req.claims = claims
        // @ts-ignore - claims is not a property of Request
        if (!claims.isSub) req.claims.isSub = await checkSubscriptionStatus(claims.uid)
        return next()
    } catch (e: any) {
        logger(`Error in auth middleware: ${e.message}`, "error")
        return res.status(401).json({ error: e.message });
    }
}

async function authenticateWithFirebase(req: Request, res: any, next: NextFunction) {
    try {
        const idToken: string = req?.header('Authorization')?.split(' ')[1] || "";
        if (!idToken) throw new Error("No ID token provided")
        // Verify the ID token first.
        const decodedToken = await getIdFromToken(idToken);
        // @ts-ignore - claims is not a property of Request
        req.claims = decodedToken
        return next()
    } catch (e: any) {
        logger(`Error in firebase auth middleware: ${e.message}`, "error")
        return res.status(401).json({ error: e.message });
    }
}

export { authenticate, authenticateWithFirebase }