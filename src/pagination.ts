export type CursorPaginationCondition = { limit: number; after?: number; before?: number };

export const cursorPaginationDefs = {
  limit: { type: "number", minimum: 0, default: 10 },
  after: { type: "number", minimum: 0 },
  before: { type: "number", minimum: 0 },
} as const;
