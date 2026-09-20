/**
 * Creates or updates an admin user, interactively.
 *
 *   npm run create:admin
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
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** bcrypt cost factor; matches prisma/seed.ts. */
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;

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
