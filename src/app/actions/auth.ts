"use server";

import { revalidatePath } from "next/cache";
import { clearSession, setSessionUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAsUser(userId: string): Promise<AuthActionResult> {
  if (!userId) {
    return { ok: false, error: "Pick a user." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, error: "Unknown user." };
  }

  await setSessionUserId(user.id);
  revalidatePath("/");
  return { ok: true };
}

export async function logout(): Promise<AuthActionResult> {
  await clearSession();
  revalidatePath("/");
  return { ok: true };
}
