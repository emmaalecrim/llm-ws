import prompts, { messengerArgs, promptTypes } from "./prompt-base/index";

const getMessages = (
    type: promptTypes,
    args: messengerArgs,
    version?: string
): { messages: object[]; config?: object; metadata: object } =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - shitty completions
    version ? prompts[type][version](args) : prompts[type]["messenger"](args);
export default getMessages;
