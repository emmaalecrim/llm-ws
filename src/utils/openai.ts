import { ChatCompletions, GetChatCompletionsOptions, OpenAIClient, OpenAIKeyCredential } from "@azure/openai";
// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

const client = new OpenAIClient(new OpenAIKeyCredential(process.env.OPENAI_KEY || ""));


const sendMessages = (
  messages: any[],
  config: GetChatCompletionsOptions = {},
  model: string = "gpt-3.5-turbo"
): Promise<ChatCompletions> => client.getChatCompletions(
  model,
  messages,
  config
);

const streamMessages = (
  messages: any[],
  config: GetChatCompletionsOptions = {},
  model: string = "gpt-3.5-turbo"
): AsyncIterable<ChatCompletions> => client.listChatCompletions(
  model,
  messages,
  config
)

// DEAR READER: The quota errors from Azure look like this:
// {
//   "message": "You exceeded your current quota, please check your plan and billing details.",
//   "type": "insufficient_quota",
//   "param": null,
//   "code": "insufficient_quota"
//   }
// yes, they are very confusing to trace back to openai, being that theres no mention of them



export { sendMessages, streamMessages };
