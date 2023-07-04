import { Configuration, OpenAIApi } from "openai";


const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

type messageConfig = {
  temperature?: number;
};

const sendMessages = (
  messages: any[],
  config: messageConfig = {},
  model: string = "gpt-3.5-turbo"
) =>
  openai.createChatCompletion({
    model,
    messages,
    stream: true,
    ...config,
  }, { responseType: "stream" })
    .then((res) => res?.data);

export { sendMessages };
