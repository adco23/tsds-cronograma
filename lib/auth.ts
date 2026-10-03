// Server-only module: single-editor auth. Whoever knows EDIT_PASSWORD gets a
// cookie that unlocks the write endpoints; everyone else can only read.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const EDITOR_COOKIE = 'editor';

// The cookie holds a hash derived from the password, never the password
// itself. Changing EDIT_PASSWORD invalidates every existing session.
function tokenFor(password: string): string {
  return createHmac('sha256', password).update('tsds-cronograma-editor').digest('hex');
}

/** false when EDIT_PASSWORD is missing, empty or blank: editing is off for everyone. */
export function editingEnabled(): boolean {
  return !!process.env.EDIT_PASSWORD?.trim();
}

function matchesPassword(token: string): boolean {
  if (!editingEnabled()) return false;
  const password = process.env.EDIT_PASSWORD!;
  const expected = Buffer.from(tokenFor(password));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Returns the cookie value to set, or null when the password is wrong. */
export function login(password: string): string | null {
  const token = tokenFor(password);
  return matchesPassword(token) ? token : null;
}

export async function isEditor(): Promise<boolean> {
  const token = (await cookies()).get(EDITOR_COOKIE)?.value;
  return !!token && matchesPassword(token);
}
