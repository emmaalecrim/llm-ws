import { ZodError, z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import archetypes from '..//prompts/prompt-base/utils/archetypes';
import { input as classifyParams } from './classify';

extendZodWithOpenApi(z);

// @ts-expect-error - zod-openapi doesn't support union of literals
export const Archetypes = z.union(Object.keys(archetypes).map((key) => z.literal(key)))
export type archetypes = z.infer<typeof Archetypes>;

export const ResponseLength = z.enum(["short", "medium", "long"]);
export const Role = z.enum(["system", "user"]);

export const MessageType = z.object({
    role: Role,
    content: z.string(),
});

export const SysMessageParams = z.object({
    host: z.string().optional()
        .openapi({ title: "host", description: "The host of the message, ie: facebook.com, twitter.com, etc. This value is important for formatting Gmail replies, as it is key for including the calendarLink and signOffName" }),
    arch: Archetypes.optional(),
    suggestion: z.string().optional()
        .openapi({ title: "suggestion", description: "The suggestion that will seed the reply. Can be any string and is only used in the reply operation" }),
    calendarLink: z.string().optional()
        .openapi({ title: "calendarLink", description: "The calendar link that will be included in the reply. Can be any string and is used in the reply, customize and compose operations. Depends on host." }),
    signOffName: z.string().optional()
        .openapi({ title: "signOffName", description: "The name that will be used in the sign off. Can be any string and is used in the reply, customize and compose operations. Depends on host." })
})
    .openapi({ title: 'SysMessageParams', description: "Parameters for the system message(in the prompt)" });

export const UserMessageParams = z.object({
    text: z.string().trim()
        .openapi({ title: "text", description: "The text the user is operating on. Can be any string and is only used in every operation." }),
    length: ResponseLength.optional()
        .openapi({ title: "length", description: "The length of the response. Can be 'short', 'medium' and 'long'. Is only used in the reply endpoint" }),
    previousResponse: z.string().optional()
        .openapi({ title: "previousResponse", description: "The previous response the user is operating on. Can be any string and is only used by the customize type operation ACT" }),
    originalText: z.string().optional()
        .openapi({ title: "originalText", description: "The original text the user is operating on. Can be any string and is only used by the customize type operation ACT" }),
    tone: z.string().optional()
        .openapi({ title: "tone", description: "tone of the message, ie: positive, negative, neutral. Can be any string and is only used by the tone type operation" }),
})
    .openapi({ title: 'UserMessageParams', description: "Parameters for the user message(in the prompt)" });

export const summarizeParams = z.object({
    text: z.string().trim(),
    length: z.coerce.number().int().positive().optional(),
})
    .openapi({ title: 'summarizeParams', description: "Parameters for the summarize operation" });

export type SummarizeParams = z.infer<typeof summarizeParams>;

// These types are duplicated in prompt-base/collections/shared and will be kept for compatibility
//  until I have time to refactor
export const messageParams = SysMessageParams.and(UserMessageParams)
    .or(summarizeParams)
    .or(classifyParams)
    .openapi({ title: 'messageParams', description: "Parameters that will be passed into a prompt or agent." })
export type MessageParams = z.infer<typeof messageParams>;

const promptTypes = z.union([
    z.literal('reply'),
    z.literal('improve'),
    z.literal('compose'),
    z.literal('customize'),
    z.literal('suggest'),
    z.literal('tone'),
    z.literal('short'),
    z.literal('classify'),
])
    .openapi({ title: 'promptTypes', description: "Name of the prompt you want to use for the completion." });


export type PromptTypes = z.infer<typeof promptTypes>;

const operationType = z.union([
    z.literal('summarize'),
    promptTypes,
])
    .openapi({ title: 'operationType', description: "The type of operation the api can perform, ie: summarize, suggest, tone, improve" });


export const inputData = z.object({
    data: messageParams,
    type: operationType,
    mode: z.enum(["stream", "completion"])
        .optional()
        .openapi({ title: "mode", description: "stream: stream completion tokens as they are generated; completion: return completions at once. Special endpoints(see suggest, classify and summarize - summarize and classify are not exposed ACT) and Agents should be used with this value as it allows for special output formatting and using LLMs to perform tasks." }),
}).openapi({
    title: 'inputData v1',
    description: "WS Completions API Schema. This endpoint is accessible via the main entrypoint in the WS protocol. It is used to generate completions, both streaming and not.",
})

// Infer types from schemas
export type OperationType = z.infer<typeof operationType>;
export type InputData = z.infer<typeof inputData>;

export const validateInput = (data: any): { success: boolean, data?: InputData, error?: ZodError } => inputData.safeParse(data)



