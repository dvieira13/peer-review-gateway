/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the shared test helpers (app with a fresh in-memory store, sample rubric, review builders).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: used by every integration test, which Claude Code ran on 2026-11-16
 * Confidence: [to be filled in by the author]
 */
import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../src/app';
import { MemoryStore } from '../src/store/memoryStore';

export const BASE = '/api/v1/evaluations';

export function makeApp() {
  const store = new MemoryStore();
  return { app: createApp({ store }), store };
}

type Scope = { project_id: string } | { course_id: string } | { lab_id: string };

/**
 * Criteria weights 3, 1, 1 with max points 10, 5, 20.
 * Example: points [8, 5, 10] -> (3*0.8 + 1*1 + 1*0.5) / 5 = 78%.
 */
export const rubricBody = (scope: Scope, name = 'Capstone rubric') => ({
  name,
  description: 'Standard project rubric',
  ...scope,
  sections: [
    {
      title: 'Technical',
      criteria: [
        { description: 'Correctness', weight: 3, max_points: 10 },
        { description: 'Security', weight: 1, max_points: 5 },
      ],
    },
    { title: 'Communication', criteria: [{ description: 'Written report', weight: 1, max_points: 20 }] },
  ],
});

export interface RubricResponse {
  id: string;
  bound_project_ids: string[];
  in_use: boolean;
  sections: { criteria: { id: string }[] }[];
}

export async function createRubric(app: ReturnType<typeof makeApp>['app'], scope: Scope): Promise<RubricResponse> {
  const res = await request(app).post(`${BASE}/rubrics`).send(rubricBody(scope));
  expect(res.status).toBe(201);
  return res.body as RubricResponse;
}

export const criterionIds = (rubric: RubricResponse): string[] =>
  rubric.sections.flatMap((s) => s.criteria.map((c) => c.id));

export const scores = (rubric: RubricResponse, points: number[]) =>
  criterionIds(rubric).map((criterion_id, i) => ({ criterion_id, points: points[i], feedback: `feedback ${i}` }));

export const reviewBody = (
  rubric: RubricResponse,
  reviewer_id: string,
  reviewer_role: 'faculty_instructor' | 'student_peer',
  points: number[],
) => ({
  reviewer_id,
  reviewer_role,
  rubric_id: rubric.id,
  scores: scores(rubric, points),
  // Neutral text: tests assert peer reviewer ids appear nowhere in responses.
  comments: `Overall comments (${reviewer_role})`,
});

export async function submitReview(
  app: ReturnType<typeof makeApp>['app'],
  projectId: string,
  body: ReturnType<typeof reviewBody>,
) {
  const res = await request(app).post(`${BASE}/projects/${projectId}/reviews`).send(body);
  expect(res.status).toBe(201);
  return res.body as { id: string; overall_score: number; reviewer_id?: string };
}

// Point sets and the percentage each produces with rubricBody().
export const P94 = [10, 4, 18];
export const P82 = [9, 3, 16];
export const P78 = [8, 5, 10];
export const P59 = [6, 2, 15];
