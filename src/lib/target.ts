import { auth } from "@/auth";

/**
 * Works out whose intake a request is about.
 * Clients always act on their own intake; admins may pass ?user=<id> to act on a client's.
 */
export async function resolveTarget(req: Request): Promise<{ userId: string; isAdmin: boolean } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const asked = new URL(req.url).searchParams.get("user");
  if (asked && asked !== session.user.id) {
    if (!session.user.isAdmin) return null;
    return { userId: asked, isAdmin: true };
  }
  return { userId: session.user.id, isAdmin: session.user.isAdmin };
}
