import { lookup } from "geoip-country"
import logger from "./logging"

export function getIpData(ip: string) {
    const data = lookup(ip)
    logger({ ip, data }, "info")
    return data
}   