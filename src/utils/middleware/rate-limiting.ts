import { usageLimiter } from "../rate-limiting";

const rateLimiterMiddleware = (req: any, res: any, next: Function) => {
    usageLimiter.consume(req.ip)
        .then((usage) => {
            const headers = {
                "Retry-After": usage.msBeforeNext / 1000,
                "X-RateLimit-Remaining": usage.remainingPoints,
                "X-RateLimit-Reset": new Date(Date.now() + usage.msBeforeNext)
            }
            res.set(headers);
            next();
        })
        .catch(() => {
            return res.status(429).send('Too Many Requests');
        });
};

export default rateLimiterMiddleware;
