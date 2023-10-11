export type Claims = {
    uid: string,
    sub: string,
    isSub: boolean
}

export interface AuthenticatedRequest extends Request {
    claims: Claims
}