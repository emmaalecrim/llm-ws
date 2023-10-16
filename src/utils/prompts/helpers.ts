import { ChatMessage } from "@azure/openai";
import { PromptTypes, MessageParams } from "../schemas/completion";
import prompts from "./prompt-base/index";

const getMessages = (
    type: PromptTypes,
    args: MessageParams,
    version?: string
): { messages: ChatMessage[]; config?: object; metadata: object } =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - shitty completions
    version ? prompts[type][version](args) : prompts[type]["messenger"](args);
export default getMessages;
