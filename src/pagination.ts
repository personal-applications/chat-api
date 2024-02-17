export type CursorPaginationCondition = { first: number; after?: number };

export type CursorPaginationResult<T> = {
  items: T[];
  hasNextPage: boolean;
};

export const cursorPaginationResultDefs = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
      },
    },
    hasNextPage: {
      type: "boolean",
    },
  },
  required: ["items", "hasNextPage"],
};
