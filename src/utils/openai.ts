import { ChatCompletions, GetChatCompletionsOptions, OpenAIClient, OpenAIKeyCredential } from "@azure/openai";
// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

const client = new OpenAIClient(new OpenAIKeyCredential(process.env.OPENAI_KEY || ""));


const sendMessages = (
  messages: any[],
  config: GetChatCompletionsOptions = { stream: true },
  model: string = "gpt-3.5-turbo"
) => config?.stream ? client.listChatCompletions(
  model,
  messages,
  config
) : client.getChatCompletions(
  model,
  messages,
  config
);





export { sendMessages };
