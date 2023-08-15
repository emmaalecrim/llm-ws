import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { CreateChatCompletionResponse } from "openai";
import { promptTypes } from "../utils/prompts/prompt-base";

// const decoder = new TextDecoder("utf-8")

const completionStreamController = async (ws: WebSocket, parsedData: any) => {
    try {
        const { data, type } = parsedData
        let prompt: promptTypes = "tone"
        switch (type) {
            case "improve":
                if (data?.tone == "short") {
                    prompt = "short"
                    break
                }
                prompt = "tone"
                break;
            default:
                prompt = type
                break
        }
        const { messages, config } = getMessages(prompt, data)
        console.debug('Starting chat completion: ', messages)
        const stream: CreateChatCompletionResponse = await sendMessages(messages, config)
        // @ts-expect-error - missing type
        for await (const chunk of stream) {
            ws.send(Buffer.from(chunk))
            console.debug('Sending chunk:\n ', chunk.toString())
        }
        console.debug('Chat completion finished')
    } catch (e: any) {
        console.error(e)
        ws.send(Buffer.from(JSON.stringify({ error: e.message }), "utf-8"))
    }
}

export default completionStreamController 