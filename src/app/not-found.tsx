import Link from "next/link";
import { COPY } from "@/lib/copy";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-4 max-w-lg text-[clamp(2rem,7vw,3.5rem)]">{COPY.notFound}</h1>
      <Link href="/" className="btn btn-ghost mt-8">
        back to the thread
      </Link>
    </main>
  );
}
