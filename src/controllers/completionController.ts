import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { csvToJson } from "../utils/parsing";
import logger from "../utils/logging";
import { promptTypes } from "../utils/prompts/prompt-base";



/**
 * Handles chat completions from OpenAI's chat completion API.
 * @param ws - The WebSocket connection.
 * @param payload - The parsed data received from the client.
 */
const completionController = async (ws: WebSocket, payload: any): Promise<void> => {
    try {
        const { data, type } = payload;
        let prompt: promptTypes = "tone";

        switch (type) {
            case "improve":
                if (data?.tone === "short") {
                    prompt = "short";
                } else {
                    prompt = "tone";
                }
                break;
            default:
                prompt = type;
                break;
        }

        const { messages, config } = getMessages(prompt, data);
        logger({ messages, config })
        const completions = await sendMessages(messages, config);
        // TODO: refactor into functional parsing
        if (type === "suggest") {
            const parsedCompletions = await csvToJson(completions?.choices[0]?.message?.content || "", ["emoji", "title", "text"])
            logger({ parsedCompletions })
            return ws.send(Buffer.from(JSON.stringify(parsedCompletions), "utf-8"));
        }
        logger({ completions })
        return ws.send(Buffer.from(JSON.stringify(completions), "utf-8"));

    } catch (e: any) {
        logger("Error in completionController: " + e, "error");
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), "utf-8"));
    }
};

export default completionController;