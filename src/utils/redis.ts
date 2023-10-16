import redis from 'redis'
import logger from './logging';


const redisClient = redis.createClient({
    disableOfflineQueue: false,
});

redisClient.on('error', (err) => {
    logger(`Redis error: ${err}`, "error")
});

export default redisClient