/**
 * AI Contribution Weight: [90%] AI Generated / [10%] Human Refactored
 * File: test/app.test.ts - smoke tests for the barebones skeleton
 * AI tool: <fill in: Claude Code / model / date>
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('skeleton', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/rubrics lists mock rubrics', async () => {
    const res = await request(app).get('/api/v1/rubrics');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /api/v1/rubrics/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/v1/rubrics/nope');
    expect(res.status).toBe(404);
  });

  it('mock rubric weights sum to 100', async () => {
    const res = await request(app).get('/api/v1/rubrics/rub-001');
    const total = res.body.criteria.reduce((s: number, c: { weight: number }) => s + c.weight, 0);
    expect(total).toBe(100);
  });
});
