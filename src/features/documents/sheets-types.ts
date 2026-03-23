export type WorkspaceSheet = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  /** Row-major; ragged rows padded on read/write. */
  rows: string[][];
};
