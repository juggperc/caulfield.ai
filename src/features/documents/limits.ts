/** Hard caps for file specs (Vercel-friendly JSON tool outputs). */
export const MAX_SHEETS = 5;
export const MAX_SHEET_ROWS = 200;
export const MAX_SHEET_COLS = 50;
export const MAX_CELL_LENGTH = 500;
export const MAX_TEXT_DOC_CHARS = 48_000;
export const MAX_WORD_BLOCKS = 120;
export const MAX_HEADING_TEXT = 2_000;
export const MAX_RUNS_PER_PARAGRAPH = 80;
export const MAX_RUN_TEXT = 4_000;
export const MAX_BULLET_ITEMS = 60;
export const MAX_BULLET_ITEM_LENGTH = 2_000;
export const MAX_DOC_EDITS_PER_CALL = 24;
export const MAX_PLAIN_TEXT_IN_REQUEST = 120_000;

/** Per-document plain text cap in main-chat workspace payload (request body). */
export const WORKSPACE_CHAT_DOC_PLAIN_MAX = 8_000;
/** Short excerpt for workspace index in system prompt. */
export const WORKSPACE_CHAT_INDEX_EXCERPT = 360;

/** In-app spreadsheet workspace (not file-spec Excel export). */
export const WORKSPACE_SHEET_ROWS = 80;
export const WORKSPACE_SHEET_COLS = 20;
export const WORKSPACE_MAX_SHEETS = 40;
export const MAX_SHEET_CELLS_PER_TOOL_CALL = 300;
