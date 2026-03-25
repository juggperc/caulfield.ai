import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { tool } from "ai";
import {
  ImageGenerationInputSchema,
  type ImageSpecPayload,
} from "./image-payload";

const RIVERFLOW_MODEL_ID = "sourceful/riverflow-v2-pro";

const getApiKey = (): string => {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  return key;
};

const sanitizeFilename = (prompt: string): string => {
  const truncated = prompt.slice(0, 50).trim();
  const sanitized = truncated
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  return sanitized || "generated-image";
};

export const createImageGenerationToolset = () => {
  const apiKey = getApiKey();
  const openrouter = createOpenRouter({ apiKey });

  const tools = {
    generate_image: tool({
      description:
        "Generate an image from a text description. Use this when the user asks to create, draw, or generate an image, illustration, or visual content. Provide a detailed prompt for best results.",
      inputSchema: ImageGenerationInputSchema,
      execute: async (input): Promise<ImageSpecPayload> => {
        try {
          // Use OpenRouter's chat completions API for image generation
          // Riverflow v2 Pro returns images in the response
          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: RIVERFLOW_MODEL_ID,
                messages: [
                  {
                    role: "user",
                    content: input.prompt,
                  },
                ],
                modalities: ["image"],
              }),
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Image generation failed: ${response.status} ${errorText}`,
            );
          }

          const result = (await response.json()) as {
            choices: Array<{
              message: {
                content?: string;
                images?: Array<{ image_url: { url: string } }>;
              };
            }>;
          };

          // Extract base64 from response
          const choice = result.choices?.[0];
          const imageData = choice?.message?.images?.[0]?.image_url?.url;

          if (!imageData) {
            throw new Error("No image returned from generation");
          }

          // Handle data URL format: data:image/png;base64,<base64>
          let base64: string;
          if (imageData.startsWith("data:")) {
            base64 = imageData.split(",")[1] ?? "";
          } else {
            base64 = imageData;
          }

          const filename = `${sanitizeFilename(input.prompt)}.png`;

          return {
            kind: "image_spec",
            format: "png",
            filename,
            base64,
            prompt: input.prompt,
            aspectRatio: input.aspectRatio ?? "1:1",
            summary: `Generated image "${filename}" (${input.aspectRatio ?? "1:1"})`,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Image generation failed";
          throw new Error(`Image generation failed: ${message}`);
        }
      },
    }),
  };

  return { tools };
};
