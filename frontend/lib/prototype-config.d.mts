export function prototypeSchema(value?: string): string;
export function quoteIdentifier(value: string): string;
export function assertPrototypeConnection(client: {
  query(sql: string, values: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}, schema: string): Promise<void>;
