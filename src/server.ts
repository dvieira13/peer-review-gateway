/**
 * AI Contribution Weight: [100%] AI Generated / [0%] Human Refactored
 * File: src/server.ts - process entry point
 * AI tool: Claude (claude.ai chat, Claude Sonnet 5.5) 2026-11-01
 */
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  console.log(`peer-review-gateway listening on :${port}`);
});
