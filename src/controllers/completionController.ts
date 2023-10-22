import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { parseCompletion, parsers } from "../utils/parsing";
import logger from "../utils/logging";
import { InputData, PromptTypes, MessageParams } from "../utils/schemas/completion";
import { Claims } from "../utils/schemas/auth";
import { waitInQueueForGptRpm, waitInQueueForGptTpm, gptTPMQueue } from "../utils/rate-limiting";
import { countMessageTokens, countTextTokens } from "../utils/rate-limiting/helpers";


const ENCODING = "utf-8";

/**
 * Handles chat completions from OpenAI's chat completion API.
 * @param ws - The WebSocket connection.
 * @param payload - The parsed data received from the client.
 */
const handlePromptTypes = async (ws: WebSocket, { prompt, data }: { prompt: PromptTypes, data: MessageParams }, retries: number = 1): Promise<void> => {
    try {
        const { messages, config } = getMessages(prompt, data);
        logger({ messages, config })
        await waitInQueueForGptRpm(1)
        const Ot = countMessageTokens(messages) // Counts outbound tokens
        await waitInQueueForGptTpm(Ot)
        const completions = await sendMessages(messages, config);
        const { usage, choices } = completions // No comming back with usage
        const It = usage?.completionTokens || countTextTokens(choices[0]?.message?.content || "")// Counts inbound tokens
        gptTPMQueue.removeTokens(It) // consume token from queue but dont wait
        // Count inbound tokens from completion response. Tt = Ot + It
        // ws.send(Buffer.from(JSON.stringify({ usage: { totalTokens: Ot + It, generatedTokens: It, promptTokens: Ot } }), ENCODING));
        if (Object.keys(parsers).includes(prompt)) {
            // @ts-expect-error - only parser keys are allowed
            const parsedCompletions = await parseCompletion(prompt, choices[0]?.message?.content || "")
                .catch(e => {
                    logger(`Error in completion parsing stage, retrying(left: ${retries}): ${e.message}`, "error");
                    if (retries > 0) handlePromptTypes(ws, { prompt, data }, retries - 1)
                })
            if (!parsedCompletions) return
            logger({ parsedCompletions })
            return ws.send(Buffer.from(JSON.stringify(parsedCompletions), ENCODING));
        }
        return ws.send(Buffer.from(JSON.stringify(completions), ENCODING));
    } catch (e: any) {
        logger(`Error in handlePromptTypes: ${JSON.stringify(e.message)}`, "error");
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
};

/**
 * Flow control for the message
 * @param {WebSocket} ws
 * @param {InputData} validatedData
 * @returns {void}
 */
const completionController = async (ws: WebSocket, validatedData: InputData, claims: Claims): Promise<void> => {
    try {
        const { type, data } = validatedData;
        if (type === "summarize") throw new Error("summarize is not supported")
        return await handlePromptTypes(ws, { prompt: type, data });
    } catch (e: any) {
        logger(`Error in completionController: ${JSON.stringify(e)}`, "error");
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
}

export default completionController;