import NewMemory from "@/components/NewMemory";
import { requirePage } from "@/lib/guard";
import { r2Configured } from "@/lib/r2";
import { dbConfigured } from "@/db";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  await requirePage();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <p className="eyebrow">new</p>
      <h1 className="display mt-3 text-[clamp(2rem,7vw,3.5rem)]">
        what <em>happened</em>
      </h1>

      {(!dbConfigured || !r2Configured()) && (
        <div className="mt-6 rounded-sm border border-sindoor/40 bg-sindoor/5 p-4 text-sm">
          <p className="mono text-[0.6875rem] text-sindoor">not wired up yet</p>
          <p className="mt-2 text-ink-soft">
            {!dbConfigured && <>DATABASE_URL is empty. </>}
            {!r2Configured() && <>R2 credentials are empty. </>}
            fill them into <span className="mono">.env.local</span> and restart — see{" "}
            <span className="mono">SETUP.md</span>.
          </p>
        </div>
      )}

      <NewMemory />
    </main>
  );
}
