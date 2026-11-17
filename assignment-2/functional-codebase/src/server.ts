/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file is the service entry point, which connects to PostgreSQL via DATABASE_URL, creates the tables and listens on PORT (default 3000).
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck and build run by Claude Code on 2026-11-16; not exercised by Vitest (needs a live database), so check it with docker compose; Not covered by unit tests (0% in the Sonar report); exercised by the Docker Compose smoke test and curl checks 8a to 8j.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import { createApp } from './app';
import { PgStore } from './store/pgStore';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const port = Number(process.env.PORT ?? 3000);

  const store = PgStore.fromUrl(databaseUrl);
  await store.init();

  const server = createApp({ store }).listen(port, () => {
    console.log(`peer-review-gateway listening on port ${port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      store.close().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
