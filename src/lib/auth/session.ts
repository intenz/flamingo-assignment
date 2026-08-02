import { cookies } from "next/headers";
import { decodeSessionCookie, encodeSessionCookie, SESSION_COOKIE } from "@/lib/auth/cookie";
import { DEFAULT_WORKSPACE_ID } from "@/lib/auth/membership";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  name: string;
  role: MembershipRole | null;
  workspaceId: string | null;
};

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  return decodeSessionCookie(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionUserId(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSessionCookie(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Current signed-in user + role in the default workspace (for the picker UI). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { workspaceId: DEFAULT_WORKSPACE_ID },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const membership = user.memberships[0] ?? null;
  return {
    id: user.id,
    name: user.name,
    role: membership?.role ?? null,
    workspaceId: membership?.workspaceId ?? null,
  };
}

export async function listSeededUsersForPicker() {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    include: {
      memberships: {
        where: { workspaceId: DEFAULT_WORKSPACE_ID },
        take: 1,
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.memberships[0]?.role ?? null,
  }));
}
