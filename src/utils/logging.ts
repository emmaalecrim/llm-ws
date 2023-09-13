// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

const debug = process.env.DEBUG === "true";

const logger = (message: any, level: "debug" | "info" | "log" | "error" = "debug"): void => {
    if (level === "debug" && debug) console[level](JSON.stringify(message, null, 2))
    else if (level !== "debug") console[level](JSON.stringify(message, null, 2))
}

export default logger