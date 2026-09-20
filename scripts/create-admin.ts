/**
 * Creates admin users.
 *
 *   npm run create:admin                          # interactive, one user
 *   npm run create:admin -- a@x.com b@x.com       # batch, generated passwords
 *   npm run create:admin -- --reset a@x.com       # also reset existing users
 *
 * Intended for production, where `npm run db:seed` must not be used: the seed
 * creates a well-known admin@vvcollectibles.nl / admin123 account, which on a
 * public URL is a live admin login with a guessable password.
 *
 * The password is read from the terminal with echo disabled. It is never
 * logged, never passed as an argument (which would land in shell history and
 * the process list) and never stored anywhere but as a bcrypt hash.
 *
 * Run it against production by exporting DATABASE_URL first:
 *
 *   read -rs "DATABASE_URL?Neon URL: " && export DATABASE_URL && npm run create:admin
 */
import { createInterface } from "node:readline";
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** bcrypt cost factor; matches prisma/seed.ts. */
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;
const GENERATED_PASSWORD_LENGTH = 20;

/**
 * Alphabet for generated passwords, with the characters that get misread when
 * a password is copied by hand removed: 0/O, 1/l/I.
 */
const PASSWORD_ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Cryptographically random password. randomInt is unbiased, unlike % length. */
function generatePassword(): string {
  let out = "";
  for (let i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Creates or updates one ADMIN user. Returns what happened, for reporting. */
async function upsertAdmin(
  rawEmail: string,
  password: string,
  name: string,
): Promise<"created" | "updated"> {
  // The login path looks users up by lowercased email, so store it that way.
  const email = rawEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", name },
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  return existing ? "updated" : "created";
}

/**
 * Batch mode: one ADMIN per address, each with a generated password.
 *
 * Existing users are skipped unless --reset is passed, so running this again
 * cannot silently change a colleague's password out from under them.
 */
async function runBatch(emails: string[], reset: boolean) {
  const invalid = emails.filter((e) => !EMAIL_RE.test(e));
  if (invalid.length) {
    throw new Error(`Not valid email addresses: ${invalid.join(", ")}`);
  }

  const results: { email: string; password: string; action: string }[] = [];

  for (const raw of emails) {
    const email = raw.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing && !reset) {
      results.push({ email, password: "—", action: `exists (${existing.role}), skipped` });
      continue;
    }

    const password = generatePassword();
    // Derive a display name from the address: "daimian@x.com" -> "Daimian".
    const local = email.split("@")[0];
    const name = local.charAt(0).toUpperCase() + local.slice(1);
    const action = await upsertAdmin(email, password, name);
    results.push({ email, password, action: `${action} as ADMIN` });
  }

  const width = Math.max(...results.map((r) => r.email.length));
  console.log("");
  for (const r of results) {
    console.log(`  ${r.email.padEnd(width)}  ${r.password.padEnd(GENERATED_PASSWORD_LENGTH)}  ${r.action}`);
  }

  const made = results.filter((r) => r.password !== "—");
  if (made.length) {
    console.log("\n  Sign in at /admin/login, then change these under /account.");
    console.log("  Send each password over a private channel, not email or chat,");
    console.log("  and clear your terminal scrollback afterwards.");
  }
  const skipped = results.filter((r) => r.password === "—");
  if (skipped.length) {
    console.log("\n  Re-run with --reset to set new passwords for skipped users.");
  }
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Reads a line without echoing it, so the password never appears on screen. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error("Not a TTY — run this interactively, not in a pipeline."));
      return;
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        switch (char) {
          case "\n":
          case "\r":
          case "\u0004": // Ctrl-D
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener("data", onData);
            stdout.write("\n");
            resolve(value);
            return;
          case "\u0003": // Ctrl-C
            stdin.setRawMode(false);
            stdin.pause();
            stdout.write("\n");
            process.exit(130);
            return;
          case "\u007f": // Backspace
          case "\b":
            value = value.slice(0, -1);
            break;
          default:
            // Ignore other control characters.
            if (char >= " ") value += char;
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  // Fail early with a clear message rather than a Prisma stack trace.
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (an empty value counts as unset).");
  }

  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const emails = args.filter((a) => !a.startsWith("--"));

  if (emails.length > 0) {
    await runBatch(emails, reset);
    return;
  }

  const rawEmail = await ask("Admin email: ");
  // The login path looks users up by lowercased email, so store it that way —
  // a mixed-case address here would create an account nobody can sign in to.
  const email = rawEmail.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Not a valid email address: ${rawEmail}`);
  }

  const name = (await ask("Display name [V&V Admin]: ")) || "V&V Admin";

  const password = await askHidden("Password (min 12 chars, not shown): ");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password === "admin123") {
    throw new Error("Refusing to set the seeded demo password.");
  }

  const confirm = await askHidden("Confirm password: ");
  if (password !== confirm) throw new Error("Passwords do not match.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const answer = await ask(
      `User ${email} already exists (role ${existing.role}). Reset password and promote to ADMIN? [y/N] `,
    );
    if (answer.toLowerCase() !== "y") {
      console.log("Aborted; nothing changed.");
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", name },
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  console.log(`\n${existing ? "Updated" : "Created"} admin: ${user.email} (${user.role})`);
  console.log("Sign in at /admin/login");
}

main()
  .catch((e) => {
    console.error(`\nError: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
