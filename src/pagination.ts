export type CursorPaginationCondition = { first: number; after?: number };

export const cursorPaginationDefs = {
  first: { type: "number", minimum: 1, default: 10 },
  after: { type: "number", minimum: 0 },
  last: { type: "number", minimum: 1, default: 10 },
  before: { type: "number", minimum: 0 },
} as const;
