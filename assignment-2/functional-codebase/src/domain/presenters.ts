/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file shapes API responses, and is the single place that strips reviewer_id from student_peer reviews (decision 6).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; anonymity asserted in test/reviews.test.ts and test/reports.test.ts
 * Confidence: [to be filled in by the author]
 */
import type { Review, Rubric } from './types';

export function presentRubric(rubric: Rubric, boundProjectIds: string[]) {
  return {
    id: rubric.id,
    name: rubric.name,
    description: rubric.description,
    scope: rubric.scope,
    sections: rubric.sections,
    bound_project_ids: boundProjectIds,
    in_use: boundProjectIds.length > 0,
    created_at: rubric.created_at,
    updated_at: rubric.updated_at,
  };
}

export type ReviewResponse = Omit<Review, 'reviewer_id'> & { reviewer_id?: string };

/** Decision 6: reviewer_id is never returned for student_peer reviews. */
export function presentReview(review: Review): ReviewResponse {
  const { reviewer_id, ...rest } = review;
  return review.reviewer_role === 'student_peer' ? rest : { ...rest, reviewer_id };
}
