/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file is the Express app factory, which takes an injected EvaluationStore so tests can use the in-memory store.
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16
 * Confidence: [to be filled in by the author]
 */
import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './errors';
import { projectsRouter } from './routes/projects';
import { reportsRouter } from './routes/reports';
import { rubricsRouter } from './routes/rubrics';
import type { EvaluationStore } from './store/store';

export interface AppDeps {
  store: EvaluationStore;
}

export function createApp({ store }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Docker health check; deliberately does not touch the database (decision 3).
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1/evaluations/rubrics', rubricsRouter(store));
  app.use('/api/v1/evaluations/projects', projectsRouter(store));
  app.use('/api/v1/evaluations/reports', reportsRouter(store));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
