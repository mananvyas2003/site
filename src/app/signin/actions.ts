"use server";

import { CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";
import { isHandle } from "@/lib/people";

export type LoginState = { error: string | null };

function messageFor(code: string): string {
  if (code.startsWith("locked:")) {
    const secs = Number(code.split(":")[1] ?? 0);
    const mins = Math.ceil(secs / 60);
    return `too many tries. wait ${mins <= 1 ? `${secs} seconds` : `${mins} minutes`}.`;
  }
  if (code === "bad-handle") return "that email isn't one of ours.";
  return "that isn't it.";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const handle = String(formData.get("handle") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!isHandle(handle)) return { error: "pick who you are first." };
  if (!password) return { error: "the password is the point." };

  try {
    await signIn("credentials", { handle, password, redirectTo: "/" });
    return { error: null };
  } catch (err) {
    // the successful path throws NEXT_REDIRECT — it must not be caught.
    // checking the digest avoids importing next's internal helper, which
    // moves between versions.
    const digest = (err as { digest?: unknown })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (err instanceof CredentialsSignin) return { error: messageFor(String(err.code ?? "wrong")) };
    console.error("[signin]", err);
    return { error: "something broke on the way in." };
  }
}
