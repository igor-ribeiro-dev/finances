const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CursorPayload {
  date: string; // YYYY-MM-DD
  id: string; // UUID
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(token: string): CursorPayload | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    const date = obj['date'];
    const id = obj['id'];
    if (typeof date !== 'string' || !ISO_DATE.test(date)) return null;
    if (typeof id !== 'string' || !UUID.test(id)) return null;
    return { date, id };
  } catch {
    return null;
  }
}
