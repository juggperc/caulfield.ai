import { z } from "zod";

export const ImageGenerationInputSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .max(4000)
    .describe("Detailed description of the image to generate"),
  aspectRatio: z
    .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"])
    .optional()
    .default("1:1")
    .describe("Aspect ratio of the generated image"),
});

export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;

export type ImageSpecPayload = {
  readonly kind: "image_spec";
  readonly format: "png";
  readonly filename: string;
  readonly base64: string;
  readonly prompt: string;
  readonly aspectRatio: string;
  readonly summary?: string;
};

export const isImageSpecOutput = (value: unknown): value is ImageSpecPayload => {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    o.kind === "image_spec" &&
    typeof o.base64 === "string" &&
    typeof o.prompt === "string"
  );
};
