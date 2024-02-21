import { PAGING_LIMIT } from "./constants";

export type CursorPaginationCondition = { limit: number; after?: number; before?: number };

export const cursorPaginationDefs = {
  first: { type: "number", minimum: 0 },
  after: { type: "number", minimum: 0 },
  last: { type: "number", minimum: 0 },
  before: { type: "number", minimum: 0 },
} as const;

export function extractCursorPaginationCondition(query: any): CursorPaginationCondition {
  if (query.after !== undefined && query.before !== undefined) {
    throw new Error("Pagination condition is not valid.");
  }
  const limit = query.first ?? query.last ?? PAGING_LIMIT;
  return {
    limit,
    after: query.after,
    before: query.before,
  };
}
