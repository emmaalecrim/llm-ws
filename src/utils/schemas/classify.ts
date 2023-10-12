import { z } from "zod";
import { normalizeText } from "normalize-text";

export const input = z.object({
  texts: z
    .object({
      text: z.coerce
        .string()
        .min(1)
        .transform((val: string): string => normalizeText(val))
        .or(z.literal("")),
    })
    .array()
});

export const output = z
  .object({
    original_comment: z.string(),
    category: z.string().toLowerCase().trim(),
    is_harmful: z.enum(["yes", "no", "maybe"]),
    description: z.string().toLowerCase().trim(),
    emoji: z.coerce.string().emoji().or(z.literal("")),
  })
  .array();

export type output = z.infer<typeof output>;
export type input = z.infer<typeof input>;
