import { GetChatCompletionsOptions, OpenAIClient, OpenAIKeyCredential } from "@azure/openai";
// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

const client = new OpenAIClient(new OpenAIKeyCredential(process.env.OPENAI_KEY || ""));


const sendMessages = (
  messages: any[],
  config: GetChatCompletionsOptions = {},
  model: string = "gpt-3.5-turbo"
) =>
  client.listChatCompletions(
    model,
    messages,
    config
  )

export { sendMessages };
