/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file tests GET /health and the JSON 404 for unknown routes.
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: run by Claude Code with npm test on 2026-11-16; CI run #34 ran this suite and it passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers';

describe('GET /health', () => {
  it('returns 200 with a small JSON body', async () => {
    const res = await request(makeApp().app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(makeApp().app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
