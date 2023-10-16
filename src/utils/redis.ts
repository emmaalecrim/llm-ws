import { createClient } from 'redis'
import logger from './logging';


const redisClient = createClient({
    disableOfflineQueue: false,
})
    .on('error', (err) => {
        logger(`Redis error: ${err}`, "error")
    })
    .on('connect', () => {
        logger(`Redis connected`)
    })
    .connect()





export default redisClient