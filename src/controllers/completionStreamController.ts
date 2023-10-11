import { WebSocket } from "ws";
import { streamMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { MessageParams, PromptTypes, InputData } from "../utils/schemas/completion";
import logger from "../utils/logging";
import { completionFreeTierLimiter } from '../utils/rate-limiting';
import { Claims } from '../utils/schemas/auth';


const ENCODING = "utf-8";
const debug = process.env.DEBUG === "true";


/**
 * Processing when 'type' is included in 'PromptTypes'
 * @param {WebSocket} ws
 * @param {{PromptTypes, MessageParams}} { prompt, data }
 * @returns {void}
 */
const handlePromptTypes = async (ws: WebSocket, { prompt, data }: { prompt: PromptTypes, data: MessageParams }): Promise<void> => {
    // Getting message and configuration
    const { messages, config } = getMessages(prompt, data);
    const events = streamMessages(messages, config);

    let loggingAccum = ""
    for await (const event of events) {
        ws.send(Buffer.from(JSON.stringify(event), ENCODING));

        if (debug) {
            for (const choice of event.choices) {
                const delta = choice.delta?.content;
                if (delta != undefined) {
                    loggingAccum += delta;
                }
            }
        }
    }
    if (debug) logger({
        prompt,
        data,
        loggingAccum
    })
}


/**
 * Flow control for the message
 * @param {WebSocket} ws
 * @param {InputData} validatedData
 * @returns {void}
 */
const completionStreamController = async (ws: WebSocket, validatedData: InputData, claims: Claims): Promise<void> => {
    try {
        // You can later move the rate limiting to the controller if you want to rate limit more granularly
        if (!claims?.isSub) completionFreeTierLimiter.consume(claims?.uid, 1)
            .then((usage) =>
                ws.send(Buffer.from(JSON.stringify({ usage }))))
            .catch((e: any) => {
                const rateLimiterError = e?.message || "You've exceeded your free tier usage. Please upgrade to a paid plan."
                logger(`Error in message usage limiter: ${rateLimiterError}`, "error")
                ws.send(Buffer.from(JSON.stringify({ error: `Error in connection rate-limit stage: ${rateLimiterError}` })))
                return ws.close()
            });
        const { type, data } = validatedData;
        if (type === "summarize") throw new Error("summarize is not supported")
        return await handlePromptTypes(ws, { prompt: type, data });
    } catch (e: any) {
        console.error(e);
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
}

// const oldCompletionStreamController = async (ws: WebSocket, parsedData: any): Promise<void> => {
//     try {
//         const { type } = data;
//         let prompt: promptTypes = "tone";

//         switch (type) {
//             case "improve":
//                 if (data?.tone === "Shorter") {
//                     prompt = "short";
//                 } else {
//                     prompt = "tone";
//                 }
//                 break;
//             default:
//                 prompt = type;
//                 break;
//         }

//         const { messages, config } = getMessages(prompt, data);

//         const events = streamMessages(messages, config);
//         for await (const event of events) {
//             // TODO: add a timeout to the stream, sigterm if it takes too long with not new event
//             ws.send(Buffer.from(JSON.stringify(event), ENCODING));
//             if (debug) {
//                 for (const choice of event.choices) {
//                     const delta = choice.delta?.content;
//                     if (delta !== undefined) {
//                         console.log(`Chatbot: ${delta}`);
//                     }
//                 }
//             }
//         }
//     } catch (e: any) {
//         console.error(e);
//         ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
//     }
// };

export default completionStreamController;