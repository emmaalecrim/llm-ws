import { RateLimiterMemory } from 'rate-limiter-flexible';

const min = 60;
const hour = 60 * min;
const day = hour * 24;
// const week = day * 7;
// const month = day * 30;

/*
    Disclaimer on execEvenly:
    Action is delayed by formula: Milliseconds before points reset / ( Remaining Points in current duration + 2 ) 
    with execEvenlyMinDelayMs = duration in milliseconds / points between actions. 
    If delay is less than execEvenlyMinDelayMs, delay is consumed points in current duration * execEvenlyMinDelayMs. 
    This formula results to dynamic leak rate as it aims to divide spare time evenly before points reset.
    
    See for more info: 
    https://github.com/animir/node-rate-limiter-flexible/wiki/Smooth-out-traffic-peaks#smooth-out-traffic-peaks
*/

const limitersConfig = {
    // This is for limiting and throttling connections to the server to prevent abuse
    default: {
        keyPrefix: "usage",
        points: 100,
        duration: min,
        execEvenly: false, // delay actions evenly.
    },
    // Note that this point system is great because we can calculate how many points to consume so users 
    // can get more out of their free tier(small context is cheaper) - nice comunity feature
    completion: {
        keyPrefix: 'completion',
        points: 10,
        duration: day,
        execEvenly: false,
    },
    // This is not implemented yet, wait for gateway
    // "fact-check": {

    //     points: 9,
    //     duration: month,
    // },
    "gpt-3.5-turbo": {
        keyPrefix: 'gpt-3.5-turbo',
        points: 90000,
        duration: min,
    },
    "gpt-4": {
        keyPrefix: 'gpt-4',
        points: 10000,
        duration: min,
    },
}



function getInMemRateLimiter(type: keyof typeof limitersConfig = "default") {
    const rateLimiter = new RateLimiterMemory(limitersConfig[type]);
    return rateLimiter
}

export const usageLimiter = getInMemRateLimiter()
export const completionFreeTierLimiter = getInMemRateLimiter("completion")
// export const factCheckFreeTierLimiter = new RateLimiterUnion(usageLimiter, getInMemRateLimiter("fact-check"))

