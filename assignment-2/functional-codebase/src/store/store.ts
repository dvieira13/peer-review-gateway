/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file defines the repository interface shared by the PostgreSQL store and the in-memory test store (decision 3).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16
 * Confidence: [to be filled in by the author]
 */
import type { Review, Rubric, ScopeType } from '../domain/types';

export type GuardedResult = 'ok' | 'not_found' | 'in_use';

export interface RubricFilter {
  scopeType?: ScopeType;
  scopeId?: string;
}

/**
 * Repository for rubrics, project-to-rubric bindings and reviews.
 * Implementations must enforce: each project is bound to at most one rubric
 * (throw ProjectAlreadyBoundError), and one review per reviewer per project
 * (throw DuplicateReviewError).
 */
export interface EvaluationStore {
  /** Inserts the rubric and binds the given projects to it, atomically. */
  createRubric(rubric: Rubric, projectIds: string[]): Promise<void>;
  getRubric(id: string): Promise<Rubric | null>;
  listRubrics(filter: RubricFilter): Promise<Rubric[]>;
  /** Replaces the rubric and its bindings only if no project is bound to it (decision 1). */
  updateRubricIfUnused(rubric: Rubric, projectIds: string[]): Promise<GuardedResult>;
  /** Deletes the rubric only if no project is bound to it (decision 1). */
  deleteRubricIfUnused(id: string): Promise<GuardedResult>;
  listBoundProjectIds(rubricId: string): Promise<string[]>;
  getBoundRubricId(projectId: string): Promise<string | null>;

  createReview(review: Review): Promise<void>;
  getReview(projectId: string, reviewId: string): Promise<Review | null>;
  listReviews(projectIds: string[]): Promise<Review[]>;
  updateReview(review: Review): Promise<boolean>;
  deleteReview(projectId: string, reviewId: string): Promise<boolean>;
}
