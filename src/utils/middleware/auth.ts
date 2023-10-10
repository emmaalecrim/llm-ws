import { NextFunction, Request } from 'express'
import jwt from 'jsonwebtoken'
import { config } from 'dotenv';
import { getIdFromToken, checkSubscriptionStatus } from '../firebase';
import logger from '../logging';


config();
const JWT_SECRET: string = process.env.JWT_SECRET || ""

export type Claims = {
    uid: string,
    sub: string,
    isSub: boolean
}

export interface AuthenticatedRequest extends Request {
    claims: Claims
}

const getTokenFromHeader = (req: Request): string => {
    try {
        return req?.headers?.["sec-websocket-protocol"] || req?.header('Authorization')?.split(' ')[1] || ""
    } catch (e: any) {
        logger(`Error in getTokenFromHeader: ${e.message}`, "error")
        return ""
    }
}

async function authenticate(req: Request, res: any, next: NextFunction) {
    try {
        const token = getTokenFromHeader(req)
        if (!token) throw new Error("No token provided")
        const claims = jwt.verify(token, JWT_SECRET) as Claims
        // @ts-ignore - claims is not a property of Request
        req.claims = claims
        // @ts-ignore - claims is not a property of Request
        if (!claims.isSub) req.claims.isSub = await checkSubscriptionStatus(claims.uid)
        return next()
    } catch (e: any) {
        logger(`Error in auth middleware: ${e.message}`, "error")
        return next(e)
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
        return next(e)
    }
}

export { authenticate, authenticateWithFirebase }