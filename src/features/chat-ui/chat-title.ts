import type { UIMessage } from "ai";

import { getMessageText } from "./message-utils";

const MAX_CHAT_TITLE_LENGTH = 72;

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const stripLeadingPromptNoise = (value: string) =>
  value.replace(
    /^(please|can you|could you|would you|help me|i need you to)\s+/i,
    "",
  );

export const buildSmartChatTitleFromText = (raw: string): string => {
  const normalized = stripLeadingPromptNoise(normalizeWhitespace(raw));
  if (!normalized) {
    return "New chat";
  }

  const title = normalized.replace(/[.!?]+$/, "");
  if (title.length <= MAX_CHAT_TITLE_LENGTH) {
    return title;
  }

  const truncated = title.slice(0, MAX_CHAT_TITLE_LENGTH);
  const boundary = truncated.lastIndexOf(" ");
  const safe =
    boundary >= Math.floor(MAX_CHAT_TITLE_LENGTH * 0.6)
      ? truncated.slice(0, boundary)
      : truncated;

  return `${safe.trimEnd()}…`;
};

export const getFirstUserPromptTitle = (messages: UIMessage[]): string => {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) {
    return "New chat";
  }

  return buildSmartChatTitleFromText(getMessageText(firstUser));
};

export const deriveChatTitle = getFirstUserPromptTitle;
