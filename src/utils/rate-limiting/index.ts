import { RateLimiterMemory, RateLimiterUnion } from 'rate-limiter-flexible';

const min = 60;
const hour = 60 * min;
const day = hour * 24;
// const week = day * 7;
const month = day * 30;

const limitersConfig = {
    // This is for limiting and throttling connections to the server to prevent abuse
    default: {
        points: 100,
        duration: min,
        // https://github.com/animir/node-rate-limiter-flexible/wiki/Smooth-out-traffic-peaks#smooth-out-traffic-peaks
        execEvenly: true, // delay actions evenly. If you're using this you have to keep points and duration in mind.
    },
    // Note that this point system is great because we can calculate how many points to consume so users 
    // can get more out of their free tier(small context is cheaper) - nice comunity feature
    completion: {
        points: 20,
        duration: day,
        execEvenly: true,
    },
    // This is not implemented yet, wait for gateway
    "fact-check": {
        points: 9,
        duration: month,
        exactEvenly: true,
    },
    "gpt-3.5-turbo": {
        points: 90000,
        duration: min,
    },
    "gpt-4": {
        points: 10000,
        duration: min,
    },
}



function getInMemRateLimiter(type: keyof typeof limitersConfig = "default") {
    const rateLimiter = new RateLimiterMemory(limitersConfig[type]);
    return rateLimiter
}

const usageLimiter = getInMemRateLimiter()
const completionFreeTierLimiter = new RateLimiterUnion(usageLimiter, getInMemRateLimiter("completion"))
const factCheckFreeTierLimiter = new RateLimiterUnion(usageLimiter, getInMemRateLimiter("fact-check"))


export {
    completionFreeTierLimiter,
    factCheckFreeTierLimiter,
    usageLimiter
} 