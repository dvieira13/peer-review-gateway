/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the shared domain types.
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; Author ran the stack in Docker Compose and exercised the endpoints with curl (checks 8a to 8j); CI run #34 passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */

export const REVIEWER_ROLES = ['faculty_instructor', 'student_peer'] as const;
export type ReviewerRole = (typeof REVIEWER_ROLES)[number];

export const SCOPE_TYPES = ['project', 'course', 'lab'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export interface RubricScope {
  type: ScopeType;
  id: string;
}

/** Decision 2: one level of sections, each containing criteria. */
export interface Criterion {
  id: string;
  description: string;
  weight: number;
  max_points: number;
}

export interface RubricSection {
  title: string;
  description: string | null;
  criteria: Criterion[];
}

export interface Rubric {
  id: string;
  name: string;
  description: string | null;
  scope: RubricScope;
  sections: RubricSection[];
  created_at: string;
  updated_at: string;
}

export interface CriterionScore {
  criterion_id: string;
  points: number;
  feedback: string | null;
}

export interface Review {
  id: string;
  project_id: string;
  rubric_id: string;
  /** Stored for every review; never returned for student_peer reviews (decision 6). */
  reviewer_id: string;
  reviewer_role: ReviewerRole;
  scores: CriterionScore[];
  comments: string | null;
  /** Decision 4: weighted percentage, 0..100. */
  overall_score: number;
  created_at: string;
  updated_at: string;
}
