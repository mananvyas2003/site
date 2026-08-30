"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "@/app/signin/actions";

const ACCENT: Record<string, string> = { manno: "#2E5E4E", momo: "#9B3B66" };

/**
 * Pick who you are, type your password. Your email is filled in automatically
 * from the config — you only need to remember the password.
 */
export default function SignInForm({
  available,
  emails,
}: {
  available: string[];
  emails: Record<string, string>;
}) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, { error: null });
  const [handle, setHandle] = useState<string>(available[0] ?? "manno");
  const passwordRef = useRef<HTMLInputElement>(null);
  const email = emails[handle] ?? "";

  // remember which of you last used this phone; it's almost always the same one
  useEffect(() => {
    try {
      const last = localStorage.getItem("mm.who");
      if (last && available.includes(last)) setHandle(last);
    } catch {
      /* private window */
    }
  }, [available]);

  useEffect(() => {
    try {
      localStorage.setItem("mm.who", handle);
    } catch {
      /* private window */
    }
  }, [handle]);

  return (
    <form action={formAction} className="mt-10 w-full max-w-xs">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="handle" value={handle} />

      <div className="flex gap-2" role="radiogroup" aria-label="who are you">
        {available.map((h) => {
          const on = h === handle;
          return (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setHandle(h);
                passwordRef.current?.focus();
              }}
              className="flex-1 rounded-sm border py-2.5 text-sm lowercase transition-colors"
              style={{
                borderColor: on ? ACCENT[h] : "var(--color-haze)",
                background: on ? `${ACCENT[h]}14` : "transparent",
                color: on ? ACCENT[h] : "var(--color-ink-soft)",
              }}
            >
              {h}
            </button>
          );
        })}
      </div>

      <p className="mono mt-3 truncate text-center text-[0.6875rem] text-ink-soft" title={email}>
        {email}
      </p>

      <input
        ref={passwordRef}
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="password"
        autoFocus
        className="field mt-3 text-center"
      />

      <Submit accent={ACCENT[handle]} />

      {state.error && (
        <p className="mono mt-3 text-center text-[0.6875rem] text-sindoor" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Submit({ accent }: { accent: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn mt-3 w-full text-paper"
      style={{ background: accent }}
    >
      {pending ? "…" : "come in"}
    </button>
  );
}
