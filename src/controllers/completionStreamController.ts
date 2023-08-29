import { WebSocket } from "ws";
import { sendMessagesAndGetList } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { ChatCompletions } from "@azure/openai";
import { messengerArgs } from "../utils/prompts/prompt-base";

// Load the .env file if it exists
import { config } from "dotenv";

// Setting up the .env configs
config();
const ENCODING = "utf-8";
const debug = process.env.DEBUG === "true";

type PromptTypes = "reply" | "improve" | "compose" | "customize"
type OperationType = 'summarize' | PromptTypes

interface IParsedData {
    type: OperationType;
    data: any;
    auth: string;
}

// New function for when 'type' equals 'summarize'
const handleSummarize = async (ws: WebSocket, data: any): Promise<void> => {
    // Empty function as defined in the question
}

// Former processing when 'type' equals 'PromptTypes'
const handlePromptTypes = async (ws: WebSocket, { prompt, data }: { prompt: PromptTypes, data: messengerArgs }): Promise<void> => {
    // Getting message and configuration
    const { messages, config } = getMessages(prompt, data);
    const events: AsyncIterable<ChatCompletions> = sendMessagesAndGetList(messages, config);

    for await (const event of events) {
        ws.send(Buffer.from(JSON.stringify(event), ENCODING));

        if (debug) {
            for (const choice of event.choices) {
                // Logging Chunk Delta
                const delta = choice.delta?.content;
                if (delta !== undefined) {
                    console.log(`Chunk Delta: ${delta}`);
                }
            }
        }
    }

    console.debug('Chat completion finished');
}


const completionStreamController = async (ws: WebSocket, parsedData: IParsedData): Promise<void> => {
    try {
        const { type, data } = parsedData;
        if (type === 'summarize') {
            return await handleSummarize(ws, data);
        } else {
            return await handlePromptTypes(ws, { prompt: type, data });
        }
    } catch (e: any) {
        console.error(e);
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
};

export default completionStreamController;