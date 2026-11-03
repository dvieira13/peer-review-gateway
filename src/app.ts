/**
 * AI Contribution Weight: [100%] AI Generated / [0%] Human Refactored
 * File: src/app.ts - Express application factory (barebones skeleton for Assignment 1)
 * AI tool: Claude (claude.ai chat, Claude Sonnet 5.5) 2026-11-01; works routes by Claude Code 2.1.316 / claude-opus-5-5 2026-11-02
 */
import express, { Request, Response } from 'express';
import { rubrics } from './data/mock';
import { works } from './data/works';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'peer-review-gateway', time: new Date().toISOString() });
  });

  app.get('/api/v1/rubrics', (_req: Request, res: Response) => {
    res.json({ data: rubrics, total: rubrics.length });
  });

  app.get('/api/v1/rubrics/:rubricId', (req: Request, res: Response) => {
    const rubric = rubrics.find((r) => r.id === req.params.rubricId);
    if (!rubric) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rubric not found' } });
      return;
    }
    res.json(rubric);
  });

  app.get('/api/v1/works', (_req: Request, res: Response) => {
    res.json({ data: works, total: works.length });
  });

  app.get('/api/v1/works/:workId', (req: Request, res: Response) => {
    const work = works.find((w) => w.id === req.params.workId);
    if (!work) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Work not found' } });
      return;
    }
    res.json(work);
  });

  return app;
}
