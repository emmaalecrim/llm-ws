import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { promptTypes } from "../utils/prompts/prompt-base";
// Load the .env file if it exists
import * as dotenv from "dotenv";
import { csvToJson } from "../utils/parsing";
dotenv.config();


const debug = process.env.DEBUG === "true";

/**
 * Handles chat completions from OpenAI's chat completion API.
 * @param ws - The WebSocket connection.
 * @param parsedData - The parsed data received from the client.
 */
const completionController = async (ws: WebSocket, parsedData: any): Promise<void> => {
    try {
        const { data, type } = parsedData;
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
        const completions = await sendMessages(messages, config);
        const parsedCompletions = await csvToJson(completions?.choices[0]?.message?.content || "", ["emoji", "title", "text"])

        if (debug) console.log(completions, parsedCompletions);
        return ws.send(Buffer.from(JSON.stringify(parsedCompletions), "utf-8"));

    } catch (e: any) {
        console.error(e);
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), "utf-8"));
    }
};

export default completionController;