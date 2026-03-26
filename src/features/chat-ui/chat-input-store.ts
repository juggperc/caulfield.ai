import { getAccountStorageScope } from "@/features/auth/storage-scope";

const INPUT_KEY_PREFIX = "caulfield:chat-input:";

const getKey = (convId: string): string => {
 const scope = getAccountStorageScope();
 return `${INPUT_KEY_PREFIX}${scope}:${convId}`;
};

export const saveChatInput = (convId: string, input: string): void => {
 if (typeof window === "undefined") return;
 if (!convId) return;
 const key = getKey(convId);
 try {
  if (input.trim()) {
   sessionStorage.setItem(key, input);
  } else {
   sessionStorage.removeItem(key);
  }
 } catch {
 }
};

export const loadChatInput = (convId: string): string => {
 if (typeof window === "undefined") return "";
 if (!convId) return "";
 const key = getKey(convId);
 try {
  return sessionStorage.getItem(key) ?? "";
 } catch {
  return "";
 }
};

export const clearChatInput = (convId: string): void => {
 if (typeof window === "undefined") return;
 if (!convId) return;
 const key = getKey(convId);
 try {
  sessionStorage.removeItem(key);
 } catch {
 }
};