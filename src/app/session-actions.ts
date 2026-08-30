"use server";

import { signOut } from "@/lib/auth";

/** Signing out is also how you hand the laptop over. */
export async function logout() {
  await signOut({ redirectTo: "/signin" });
}
