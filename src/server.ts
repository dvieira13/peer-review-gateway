/**
 * AI Contribution Weight: [90%] AI Generated / [10%] Human Refactored
 * File: src/server.ts - process entry point
 * AI tool: <fill in: Claude Code / model / date>
 */
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  console.log(`peer-review-gateway listening on :${port}`);
});
