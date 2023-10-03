import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { csvToJson } from "../utils/parsing";
import logger from "../utils/logging";
import { InputData, PromptTypes, MessageParams } from "../utils/schemas/completion";


const ENCODING = "utf-8";

/**
 * Handles chat completions from OpenAI's chat completion API.
 * @param ws - The WebSocket connection.
 * @param payload - The parsed data received from the client.
 */
const handlePromptTypes = async (ws: WebSocket, { prompt, data }: { prompt: PromptTypes, data: MessageParams }): Promise<void> => {
    try {
        const { messages, config } = getMessages(prompt, data);
        logger({ messages, config })
        const completions = await sendMessages(messages, config);
        // TODO: refactor into functional parsing so this supports classify too
        if (prompt === "suggest") {
            const parsedCompletions = await csvToJson(completions?.choices[0]?.message?.content || "", ["emoji", "title", "text"])
            logger({ parsedCompletions })
            return ws.send(Buffer.from(JSON.stringify(parsedCompletions), ENCODING));
        }
        logger({ completions })
        return ws.send(Buffer.from(JSON.stringify(completions), ENCODING));

    } catch (e: any) {
        logger("Error in completionController: ", "error");
        logger(e, "error");
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
};

/**
 * Flow control for the message
 * @param {WebSocket} ws
 * @param {InputData} validatedData
 * @returns {void}
 */
const completionController = async (ws: WebSocket, validatedData: InputData): Promise<void> => {
    try {
        const { type, data } = validatedData;
        if (type === "summarize") throw new Error("summarize is not supported")
        return await handlePromptTypes(ws, { prompt: type, data });
    } catch (e: any) {
        console.error(e);
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
}

export default completionController;