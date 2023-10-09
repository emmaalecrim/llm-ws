import { usageLimiter } from "../rate-limiting";

const rateLimiterMiddleware = (req: any, res: any, next: Function) => {
    usageLimiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            return res.status(429).send('Too Many Requests');
        });
};

export default rateLimiterMiddleware;
