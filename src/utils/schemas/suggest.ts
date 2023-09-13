import { z } from "zod";
import { normalizeText } from "normalize-text";

export const input = z.object({
    text: z.coerce
        .string()
        .min(1)
        .transform((val: string): string => normalizeText(val))
    ,
    debug: z.boolean().optional(),
});

export const output = z.object({
    title: z.string().toLowerCase().trim(),
    text: z.string().toLowerCase().trim(),
    emoji: z.coerce.string().emoji().or(z.literal("")),
}).array().length(4);

export type output = z.infer<typeof output>;
export type input = z.infer<typeof input>;
