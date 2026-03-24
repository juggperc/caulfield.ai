import { describe, expect, it } from "vitest";

import {
  buildSmartChatTitleFromText,
  deriveChatTitle,
} from "@/features/chat-ui/chat-title";
import type { UIMessage } from "ai";

describe("buildSmartChatTitleFromText", () => {
  it("strips prompt filler and trailing punctuation", () => {
    expect(
      buildSmartChatTitleFromText(
        "Please summarize the benefits of markdown for internal docs.",
      ),
    ).toBe("summarize the benefits of markdown for internal docs");
  });

  it("truncates long titles on a word boundary", () => {
    expect(
      buildSmartChatTitleFromText(
        "Create a concise project launch checklist for a multi-team migration with deadlines and owners across engineering product design and support",
      ),
    ).toBe(
      "Create a concise project launch checklist for a multi-team migration…",
    );
  });
});

describe("deriveChatTitle", () => {
  it("uses the first user message text", () => {
    const messages = [
      {
        id: "u1",
        role: "user",
        parts: [
          {
            type: "text",
            text: "Could you draft release notes for version 2.4.1?",
          },
        ],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "Sure." }],
      },
    ] satisfies UIMessage[];

    expect(deriveChatTitle(messages)).toBe("draft release notes for version 2.4.1");
  });

  it("falls back to New chat when there is no user prompt", () => {
    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "Hello." }],
      },
    ] satisfies UIMessage[];

    expect(deriveChatTitle(messages)).toBe("New chat");
  });
});
