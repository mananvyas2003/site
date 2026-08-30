import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { hashPassword, PEOPLE, HANDLES, type Handle } from "../src/lib/people";

const ENV = ".env.local";

/**
 * Writes password hashes (and AUTH_SECRET, if missing) straight into
 * .env.local. The plaintext is never stored anywhere — not in the file, not
 * in your shell history.
 */
function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  if (!hidden) {
    return new Promise((resolve) => rl.question(question, (a) => (rl.close(), resolve(a.trim()))));
  }

  return new Promise((resolve) => {
    const stdout = process.stdout as NodeJS.WriteStream & { muted?: boolean };
    stdout.write(question);
    stdout.muted = true;

    // swallow the echoed characters while still letting readline see them
    const origWrite = stdout.write.bind(stdout);
    (stdout as unknown as { write: (c: string) => boolean }).write = (chunk: string) => {
      if (!stdout.muted) return origWrite(chunk);
      if (typeof chunk === "string" && (chunk.includes("\n") || chunk.includes("\r"))) return origWrite("\n");
      return true;
    };

    rl.question("", (answer) => {
      stdout.muted = false;
      (stdout as unknown as { write: typeof origWrite }).write = origWrite;
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Values are single-quoted. dotenv-expand — which Next.js runs every .env
 * value through — expands `$name` inside bare and double-quoted values, but
 * leaves single-quoted ones alone. Without this, a password containing a `$`
 * is silently truncated and you're locked out.
 */
function upsertEnv(lines: string[], key: string, value: string): string[] {
  const line = value ? `${key}='${value.replace(/'/g, "'\\''")}'` : `${key}=`;
  const idx = lines.findIndex((l) => l.trimStart().startsWith(`${key}=`));
  if (idx >= 0) {
    lines[idx] = line;
    return lines;
  }
  return [...lines, line];
}

async function main() {
  if (!existsSync(ENV)) {
    console.error(`${ENV} is missing — copy .env.example to .env.local first.`);
    process.exit(1);
  }

  let lines = readFileSync(ENV, "utf8").split(/\r?\n/);

  console.log("\n  manno weds momo — passwords\n");
  console.log("  one password each. not a shared one: the site needs to know");
  console.log("  which of you wrote which version.\n");

  const only = process.argv[2];
  const targets: Handle[] = only && HANDLES.includes(only as Handle) ? [only as Handle] : HANDLES;

  for (const handle of targets) {
    const person = PEOPLE[handle];
    const pw = await ask(`  password for ${handle} (${person.displayName}), blank to skip: `, true);
    if (!pw) {
      console.log(`  · skipped ${handle}\n`);
      continue;
    }
    if (pw.length < 8) {
      console.log(`  ! that's ${pw.length} characters. use at least 8.\n`);
      process.exit(1);
    }
    const again = await ask(`  again: `, true);
    if (pw !== again) {
      console.log("  ! they don't match. nothing was written.\n");
      process.exit(1);
    }

    lines = upsertEnv(lines, person.hashKey, hashPassword(pw));
    // a leftover plaintext value would be ignored, but leaving it is untidy
    lines = upsertEnv(lines, person.passwordKey, "");
    console.log(`  ✓ ${handle}\n`);
  }

  if (!process.env.AUTH_SECRET?.trim()) {
    lines = upsertEnv(lines, "AUTH_SECRET", randomBytes(32).toString("base64"));
    console.log("  ✓ AUTH_SECRET generated\n");
  }

  writeFileSync(ENV, lines.join("\n"), "utf8");
  console.log(`  written to ${ENV}. restart the dev server.\n`);
  console.log("  deploying? copy the *_PASSWORD_HASH and AUTH_SECRET lines");
  console.log("  into your host's environment variables too.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
