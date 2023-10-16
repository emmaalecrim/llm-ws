import Redis from 'ioredis';
import logger from './logging';
import { config } from 'dotenv';


config()
const [url, port, password] = process.env.REDIS?.split(":") || ["redis://localhost", "6379"]

const redisClient = new Redis({
    enableOfflineQueue: false,
    host: url,
    port: parseInt(port),
    password
})
    .on('error', (err: any) => {
        logger(`Redis error: ${err}`, "error")
    })
    .on('connect', () => {
        logger(`Redis connected`)
    })






export default redisClient