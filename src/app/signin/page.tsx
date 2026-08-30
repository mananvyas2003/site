import { redirect } from "next/navigation";
import SiteTitle from "@/components/SiteTitle";
import SignInForm from "@/components/SignInForm";
import { auth } from "@/lib/auth";
import { authConfigured, configuredHandles, emailFor, isHandle } from "@/lib/people";

export const dynamic = "force-dynamic";

export default async function SignIn() {
  const session = await auth();
  if (session?.user && isHandle(session.user.handle)) redirect("/");

  const available = configuredHandles();
  const ready = authConfigured();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">two people</p>
      <h1 className="display mt-4 text-[clamp(2.5rem,10vw,5rem)]">
        <SiteTitle />
      </h1>
      <p className="mt-4 max-w-sm text-ink-soft">
        pick who you are, type your password. your email is already wired in — there&apos;s no sign-up,
        because there are only two accounts and they already exist.
      </p>

      {ready ? (
        <SignInForm
          available={available}
          emails={{ manno: emailFor("manno"), momo: emailFor("momo") }}
        />
      ) : (
        <div className="card mt-9 max-w-md rounded-sm p-5 text-left text-sm">
          <p className="mono text-[0.6875rem] text-sindoor">no password is set yet</p>
          <p className="mt-2 text-ink-soft">
            run <span className="mono">npm run set-password</span> to set one for each of you, then restart.
            {!process.env.AUTH_SECRET?.trim() && (
              <>
                {" "}
                <span className="mono">AUTH_SECRET</span> also needs a value — the same command fills it in.
              </>
            )}
          </p>
          <p className="mt-3 text-ink-soft">until then the site runs unlocked on localhost so you can look around.</p>
        </div>
      )}

    </main>
  );
}
