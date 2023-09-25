import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { csvToJson } from "../utils/parsing";
import logger from "../utils/logging";
import { InputData } from "../utils/schemas/completion";


const ENCODING = "utf-8";

/**
 * Handles chat completions from OpenAI's chat completion API.
 * @param ws - The WebSocket connection.
 * @param payload - The parsed data received from the client.
 */
const completionController = async (ws: WebSocket, payload: InputData): Promise<void> => {
    try {
        const { data, type } = payload;
        const { messages, config } = getMessages(type, data);
        logger({ messages, config })
        const completions = await sendMessages(messages, config);
        // TODO: refactor into functional parsing
        if (type === "suggest") {
            const parsedCompletions = await csvToJson(completions?.choices[0]?.message?.content || "", ["emoji", "title", "text"])
            logger({ parsedCompletions })
            return ws.send(Buffer.from(JSON.stringify(parsedCompletions), ENCODING));
        }
        logger({ completions })
        return ws.send(Buffer.from(JSON.stringify(completions), ENCODING));

    } catch (e: any) {
        logger("Error in completionController: " + e, "error");
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
};

export default completionController;