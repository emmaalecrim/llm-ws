import { WebSocket } from "ws";
import { sendMessagesAndGetList } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { ChatCompletions } from "@azure/openai";
import { config } from "dotenv";
import { InputData, MessageParams, PromptTypes } from "../utils/schemas/completion";
import { summerizeToFitContextBudget } from "../utils/summarize/summarize";

// Setting up the .env configs
config();
const ENCODING = "utf-8";
const debug = process.env.DEBUG === "true";

const promptTypes = ['reply', 'improve', 'compose', 'customize']


// New function for when 'type' equals 'summarize'
const handleSummarize = async (ws: WebSocket, data: any): Promise<void> => {
    const { text, length = 280 } = data;
    // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
    // lenght is the number of tokens, not the number of characters. Aproximately 4 characters per token.
    const summary = await summerizeToFitContextBudget(text, length * 4);
    ws.send(Buffer.from(JSON.stringify({ summary }), ENCODING));
    if (debug)
        console.log(`Summary: ${summary}`);
}

// Former processing when 'type' equals 'PromptTypes'
const handlePromptTypes = async (ws: WebSocket, { prompt, data }: { prompt: PromptTypes, data: MessageParams }): Promise<void> => {
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


const completionStreamController = async (ws: WebSocket, validatedData: InputData): Promise<void> => {
    try {
        const { type, data } = validatedData;
        if (type === 'summarize') {
            return await handleSummarize(ws, data);
        } else if (promptTypes.includes(type)) {
            return await handlePromptTypes(ws, { prompt: type, data });
        }
    } catch (e: any) {
        console.error(e);
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), ENCODING));
    }
};

export default completionStreamController;