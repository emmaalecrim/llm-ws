const Redis = require('ioredis');
import logger from './logging';


const redisClient = new Redis({
    enableOfflineQueue: false
})
    .on('error', (err: any) => {
        logger(`Redis error: ${err}`, "error")
    })
    .on('connect', () => {
        logger(`Redis connected`)
    })






export default redisClient