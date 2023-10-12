import { RateLimiterMemory, RateLimiterQueue } from 'rate-limiter-flexible';

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
    "gpt-3.5-turbo-rpm": {
        keyPrefix: 'gpt-3.5-turbo-rpm',
        points: 3500,
        duration: min,
    },
    "gpt-3.5-turbo-tpm": {
        keyPrefix: 'gpt-3.5-turbo-tpm',
        points: 90000,
        duration: min,
    },
}



function getInMemRateLimiter(type: keyof typeof limitersConfig = "default") {
    const rateLimiter = new RateLimiterMemory(limitersConfig[type]);
    return rateLimiter
}

const gptRPMLimiter = getInMemRateLimiter("gpt-3.5-turbo-rpm")
const gptTPMLimiter = getInMemRateLimiter("gpt-3.5-turbo-tpm")

const gptRPMQueue = new RateLimiterQueue(gptRPMLimiter)
const gptTPMQueue = new RateLimiterQueue(gptTPMLimiter)


export const waitInQueue = async (queue: RateLimiterQueue, cost: number = 1) => await queue.removeTokens(cost)

export const usageLimiter = getInMemRateLimiter()
export const completionFreeTierLimiter = getInMemRateLimiter("completion")


export const waitInQueueForGPT = (tokenCost: number) => Promise.race([waitInQueue(gptRPMQueue), waitInQueue(gptTPMQueue, tokenCost)])





