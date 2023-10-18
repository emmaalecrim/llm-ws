import { ChatMessage } from '@azure/openai';
import openaiTokenCounter from 'openai-gpt-token-counter';


export function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

// messages: ChatMessage[], model: "gpt-3.5-turbo" | "gpt-4" = "gpt-3.5-turbo"

interface Message {
    role?: string;
    content: string;
    name?: string;
}

export const countMessageTokens = (messages: ChatMessage[], model: "gpt-3.5-turbo" | "gpt-4" = "gpt-3.5-turbo"): number => openaiTokenCounter.chat(messages as Message[], model);
export const countTextTokens = (text: string, model: "gpt-3.5-turbo" | "gpt-4" = "gpt-3.5-turbo"): number => openaiTokenCounter.text(text, model);

