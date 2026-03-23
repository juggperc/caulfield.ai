export type WorkspaceChatDocumentBrief = {
  id: string;
  title: string;
  updatedAt: number;
  revision: number;
  plainText: string;
};

let getter: () => WorkspaceChatDocumentBrief[] = () => [];

export const registerWorkspaceDocumentsForChat = (
  fn: () => WorkspaceChatDocumentBrief[],
) => {
  getter = fn;
};

export const resetWorkspaceDocumentsForChat = () => {
  getter = () => [];
};

export const getWorkspaceDocumentsForChat = (): WorkspaceChatDocumentBrief[] =>
  getter();
