import { z } from "zod";
import { normalizeText } from "normalize-text";

export const output = z.coerce
    .string().min(1).transform((val: string): string => normalizeText(val)) // string

export type output = z.infer<typeof output>;
