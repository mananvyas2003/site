import Link from "next/link";
import { requirePage } from "@/lib/guard";
import { getStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requirePage();
  const stats = await getStats();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <p className="eyebrow">export</p>
      <h1 className="display mt-3 text-[clamp(2rem,7vw,3.5rem)]">
        this is <em>not</em> the only copy
      </h1>

      <p className="mt-5 text-ink-soft">
        the originals stay in google photos and on a hard drive. this site holds compressed web copies and the
        writing. do this every quarter and keep the file somewhere you both have — not because anything will go
        wrong, but because an archive that lives at one person&apos;s discretion is a bad archive.
      </p>

      <div className="card mt-8 rounded-sm p-5">
        <div className="mono grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
          <Stat label="memories" value={stats.memories} />
          <Stat label="photos" value={stats.photos} />
          <Stat label="versions" value={stats.notes} />
          <Stat label="letters" value={stats.letters} />
        </div>

        <a href="/api/export" download className="btn btn-primary mt-6">
          download the json
        </a>
      </div>

      <div className="mt-8">
        <h2 className="eyebrow">the other half</h2>
        <p className="mt-3 text-sm text-ink-soft">
          the json holds every row and every object key, but not the image bytes. mirror the bucket alongside it:
        </p>
        <pre className="mono mt-3 overflow-x-auto rounded-sm border border-haze bg-paper-deep p-4 text-[0.75rem]">
{`# once: rclone config → new remote → s3 → Cloudflare R2
rclone sync r2:YOUR_BUCKET ./mm-photos --progress`}
        </pre>
      </div>

      <Link href="/" className="eyebrow mt-10 inline-block underline underline-offset-4">
        ← back
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-0.5 text-xl">{value.toLocaleString("en-IN")}</div>
    </div>
  );
}
