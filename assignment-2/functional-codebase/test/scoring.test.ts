/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file unit-tests the weighted percentage, letter grades and role separation in aggregation.
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: run by Claude Code with npm test on 2026-11-16; CI run #34 ran this suite and it passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import { describe, expect, it } from 'vitest';
import { aggregateRole, computeOverallScore, letterGrade } from '../src/domain/scoring';
import type { Review, Rubric } from '../src/domain/types';

const rubric: Rubric = {
  id: 'r1',
  name: 'r',
  description: null,
  scope: { type: 'course', id: 'CS501' },
  sections: [
    { title: 's', description: null, criteria: [
      { id: 'a', description: 'a', weight: 3, max_points: 10 },
      { id: 'b', description: 'b', weight: 1, max_points: 5 },
    ] },
  ],
  created_at: '2026-11-16T00:00:00.000Z',
  updated_at: '2026-11-16T00:00:00.000Z',
};

const review = (role: Review['reviewer_role'], score: number, t: string): Review => ({
  id: t,
  project_id: 'p',
  rubric_id: 'r1',
  reviewer_id: `u-${t}`,
  reviewer_role: role,
  scores: [],
  comments: null,
  overall_score: score,
  created_at: t,
  updated_at: t,
});

describe('scoring', () => {
  it('computes the weighted percentage', () => {
    // (3 * 5/10 + 1 * 5/5) / 4 = 62.5%
    expect(computeOverallScore(rubric, [
      { criterion_id: 'a', points: 5, feedback: null },
      { criterion_id: 'b', points: 5, feedback: null },
    ])).toBe(62.5);
    expect(computeOverallScore(rubric, [
      { criterion_id: 'a', points: 10, feedback: null },
      { criterion_id: 'b', points: 5, feedback: null },
    ])).toBe(100);
  });

  it('maps percentages to letter grades at the boundaries', () => {
    expect([90, 89.99, 80, 70, 60, 59.99].map(letterGrade)).toEqual(['A', 'B', 'B', 'C', 'D', 'F']);
  });

  it('aggregates only the requested role', () => {
    const all = [review('faculty_instructor', 90, '1'), review('student_peer', 10, '2'), review('faculty_instructor', 70, '3')];
    const faculty = aggregateRole(all, 'faculty_instructor');
    expect(faculty).toMatchObject({ review_count: 2, mean_score: 80, std_dev: 10 });
    const peer = aggregateRole(all, 'student_peer');
    expect(peer).toMatchObject({ review_count: 1, mean_score: 10, std_dev: 0 });
  });
});
