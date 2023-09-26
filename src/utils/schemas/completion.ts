import { ZodError, z } from 'zod';

export const ResponseLength = z.enum(["short", "medium", "long"]);
export const Role = z.enum(["system", "user"]);

export const MessageType = z.object({
    role: Role,
    content: z.string(),
});

export const SysMessageParams = z.object({
    host: z.string(),
    arch: z.string(),
    suggestion: z.string().optional(),
    calendarLink: z.string().optional(),
    signOffName: z.string().optional(),
});

export const UserMessageParams = z.object({
    text: z.string().trim(),
    length: ResponseLength.optional(),
    previousResponse: z.string().optional(),
    originalText: z.string().optional(),
    tone: z.string().optional(),
});

export const summarizeParams = z.object({
    text: z.string().trim(),
    length: z.coerce.number().int().positive().optional(),
});

export type SummarizeParams = z.infer<typeof summarizeParams>;

// These types are duplicated in prompt-base/collections/shared and will be kept for compatibility
//  until I have time to refactor
export const messageParams = SysMessageParams.and(UserMessageParams)//.or(summarizeParams);
export type MessageParams = z.infer<typeof messageParams>;

const promptTypes = z.union([
    z.literal('reply'),
    z.literal('improve'),
    z.literal('compose'),
    z.literal('customize'),
    z.literal('suggest'),
    z.literal('tone'),
    z.literal('short'),
]);


export type PromptTypes = z.infer<typeof promptTypes>;

const operationType = z.union([
    z.literal('summarize'),
    promptTypes,
]);


const inputData = z.object({
    data: messageParams,
    type: operationType,
    mode: z.enum(["stream"]).optional(),
});

// Infer types from schemas
export type OperationType = z.infer<typeof operationType>;
export type InputData = z.infer<typeof inputData>;

export const validateInput = (data: any): { success: boolean, data?: InputData, error?: ZodError } => inputData.safeParse(data)



