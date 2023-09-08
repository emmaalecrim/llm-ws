import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { promptTypes } from "../utils/prompts/prompt-base";
import { ChatCompletions } from "@azure/openai";
// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();


const debug = process.env.DEBUG === "true";

/**
 * Handles streaming chat completions from OpenAI's chat completion API.
 * @param ws - The WebSocket connection.
 * @param parsedData - The parsed data received from the client.
 */
const completionStreamController = async (ws: WebSocket, parsedData: any): Promise<void> => {
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

        const events: AsyncIterable<ChatCompletions> = sendMessages(messages, config);
        for await (const event of events) {
            ws.send(Buffer.from("data: " + JSON.stringify(event), "utf-8"));
            if (debug) {
                for (const choice of event.choices) {
                    const delta = choice.delta?.content;
                    if (delta !== undefined) {
                        console.log(`Chatbot: ${delta}`);
                    }
                }
            }
        }
    } catch (e: any) {
        console.error(e);
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), "utf-8"));
    }
};

export default completionStreamController;