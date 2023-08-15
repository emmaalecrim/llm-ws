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

export const output = z.coerce
    .string().min(1).transform((val: string): string => normalizeText(val)) // string
    .array().length(4) // array of 4 strings
// For when we wanna offer suggestion sets
// .array().nonempty() // non empty array with array of 4 strings

export type output = z.infer<typeof output>;
export type input = z.infer<typeof input>;
