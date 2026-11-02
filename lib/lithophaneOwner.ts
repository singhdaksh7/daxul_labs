import { cookies } from 'next/headers';
import { getAuthSession, requireAdminSession } from '@/lib/auth';
import { LITHO_OWNER_COOKIE, type Caller } from '@/lib/lithophaneAccess';

/** Resolve the caller (user id + guest owner cookie) for the current request. Never throws. */
export async function getLithophaneCaller(opts: { checkAdmin?: boolean } = {}): Promise<Caller> {
  let userId: string | null = null;
  let ownerCookie: string | null = null;
  let isAdmin = false;
  try {
    const session = await getAuthSession();
    userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  } catch {
    /* anonymous */
  }
  try {
    const jar = await cookies();
    ownerCookie = jar.get(LITHO_OWNER_COOKIE)?.value ?? null;
  } catch {
    /* outside request scope */
  }
  if (opts.checkAdmin) {
    try {
      isAdmin = (await requireAdminSession()).authorized;
    } catch {
      isAdmin = false;
    }
  }
  return { userId, ownerCookie, isAdmin };
}
