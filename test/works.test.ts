/**
 * AI Contribution Weight: [100%] AI Generated / [0%] Human Refactored
 * File: test/works.test.ts - tests for GET /api/v1/works and GET /api/v1/works/:workId
 * AI tool: Claude Code / claude-opus-5-5 / 2026-11-02
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('works', () => {
  const app = createApp();

  it('GET /api/v1/works lists both mock works', async () => {
    const res = await request(app).get('/api/v1/works');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data.map((w: { id: string }) => w.id)).toEqual(['work-001', 'work-002']);
  });

  it('GET /api/v1/works/:workId returns the matching work', async () => {
    const res = await request(app).get('/api/v1/works/work-002');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'work-002',
      title: 'Accessible Transit Planner',
      ownerIds: ['usr-stu-02', 'usr-stu-03'],
      courseId: 'CS701',
      publishedAt: '2026-10-22T00:00:00Z',
    });
  });

  it('GET /api/v1/works/:workId returns 404 with NOT_FOUND for unknown id', async () => {
    const res = await request(app).get('/api/v1/works/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
