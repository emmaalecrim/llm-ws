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
    suggestion: z.string(),
    calendarLink: z.string().optional(),
    signOffName: z.string().optional(),
});

export const UserMessageParams = z.object({
    text: z.string(),
    length: ResponseLength.optional(),
    previousResponse: z.string().optional(),
    originalText: z.string().optional(),
});

export const MessageParams = SysMessageParams.and(UserMessageParams);
export type MessageParams = z.infer<typeof MessageParams>;

const promptTypes = z.union([
    z.literal('reply'),
    z.literal('improve'),
    z.literal('compose'),
    z.literal('customize'),
]);

export type PromptTypes = z.infer<typeof promptTypes>;

const operationType = z.union([
    z.literal('summarize'),
    promptTypes,
]);

const iParsedData = z.object({
    type: operationType,
    data: MessageParams,
    auth: z.string(),
});

// Infer types from schemas
export type OperationType = z.infer<typeof operationType>;
export type IParsedData = z.infer<typeof iParsedData>;

export const validateInput = (data: any): { success: boolean, data?: IParsedData, error?: ZodError } => iParsedData.safeParse(data)



