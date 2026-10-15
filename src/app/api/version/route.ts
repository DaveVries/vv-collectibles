import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Which commit is actually running.
 *
 * Exists because "did the redeploy go out?" was repeatedly unanswerable from
 * outside, and debugging a payment integration against an unknown build
 * wastes a round trip every time. Vercel injects the git SHA at build time.
 *
 * Deliberately exposes nothing sensitive: a commit SHA of a repository, and
 * which environment the deployment is. No credentials, no configuration
 * values — only whether each required variable is present.
 */
export function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "unknown",
    env: process.env.VERCEL_ENV ?? "local",
    raboEnvironment: process.env.RABO_ENVIRONMENT ?? "sandbox (default)",
    configured: {
      database: Boolean(process.env.DATABASE_URL),
      nextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      raboRefreshToken: Boolean(process.env.RABO_REFRESH_TOKEN),
      raboSigningKey: Boolean(process.env.RABO_SIGNING_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
      emailFrom: Boolean(process.env.EMAIL_FROM),
    },
  });
}
