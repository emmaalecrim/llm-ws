import { summerizeToFitContextBudget } from "../utils/summarize/summarize";
import logger from "../utils/logging";


const ENCODING = "utf-8";
// New function for when 'type' equals 'summarize'
export const handleSummarize = async (ws: WebSocket, data: any): Promise<void> => {
    const { text, length = 280 } = data;
    // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
    // lenght is the number of tokens, not the number of characters. Aproximately 4 characters per token.
    const summary = await summerizeToFitContextBudget(text, length * 4);
    ws.send(Buffer.from(JSON.stringify({ summary }), ENCODING));
    logger({ summary })
}