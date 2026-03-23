import type { UIMessage } from "ai";

export const getLatestUserTextFromUiMessages = (
  messages: UIMessage[],
): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = m.parts
      .filter(
        (p): p is { type: "text"; text: string } => p.type === "text",
      )
      .map((p) => p.text)
      .join("");
    const t = text.trim();
    if (t) return t;
  }
  return "";
};
