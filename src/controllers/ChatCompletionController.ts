import { WebSocket } from "ws";
import { sendMessages } from "../utils/openai";
import getMessages from "../utils/prompts/helpers";
import { CreateChatCompletionResponse } from "openai";

// const decoder = new TextDecoder("utf-8")

const ChatCompletionController = async (ws: WebSocket, parsedData: any) => {
    try {
        const { data, type } = parsedData
        const { messages, config } = getMessages(type, data)
        console.debug('Starting chat completion')
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

export default ChatCompletionController 