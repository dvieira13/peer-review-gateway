/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file is the service entry point, which connects to PostgreSQL via DATABASE_URL, creates the tables and listens on PORT (default 3000).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck and build run by Claude Code on 2026-11-16; not exercised by Vitest (needs a live database), so check it with docker compose
 * Confidence: [to be filled in by the author]
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
