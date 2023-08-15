import { z } from "zod";

export const input = z.object({
    goals: z.coerce.string(),
    personalities: z.coerce.string(),
    interests: z.coerce.string(),
    exclusions: z.coerce.string(),
    isControversial: z.coerce.boolean().optional(),
});

export const output = z.object({
    username: z.coerce.string(),
    tweet: z.coerce.string(),
}).array()


export type input = z.infer<typeof input>;
export type output = z.infer<typeof output>;
