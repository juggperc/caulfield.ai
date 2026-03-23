import type { JSONContent } from "@tiptap/core";
import { getSheetsChatPayload } from "./sheets-chat-bridge";

export type DocsChatActiveDocument = {
  id: string;
  title: string;
  revision: number;
  contentJson: JSONContent;
};

export type DocsChatSelection = {
  from: number;
  to: number;
  text: string;
};

export type DocsChatSnapshot = {
  getActiveDocument: () => DocsChatActiveDocument | undefined;
  getPlainText: () => string;
  getSelection: () => DocsChatSelection | undefined;
};

const emptySnapshot: DocsChatSnapshot = {
  getActiveDocument: () => undefined,
  getPlainText: () => "",
  getSelection: () => undefined,
};

let snapshot: DocsChatSnapshot = emptySnapshot;

export const registerDocsChatSnapshot = (next: DocsChatSnapshot) => {
  snapshot = next;
};

export const resetDocsChatSnapshot = () => {
  snapshot = emptySnapshot;
};

export const getDocsChatBodyFields = () => ({
  mode: "docs" as const,
  activeDocument: snapshot.getActiveDocument(),
  documentPlainText: snapshot.getPlainText(),
  docSelection: snapshot.getSelection(),
  ...getSheetsChatPayload(),
});
