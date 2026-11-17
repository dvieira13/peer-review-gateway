/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file is the in-memory EvaluationStore used by the test suite (decision 3).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; exercised by every integration test
 * Confidence: [to be filled in by the author]
 */
import { DuplicateReviewError, ProjectAlreadyBoundError } from '../errors';
import type { Review, Rubric } from '../domain/types';
import type { EvaluationStore, GuardedResult, RubricFilter } from './store';

const clone = <T>(v: T): T => structuredClone(v);

export class MemoryStore implements EvaluationStore {
  private readonly rubrics = new Map<string, Rubric>();
  /** project_id -> rubric_id; a Map key can only hold one rubric per project. */
  private readonly bindings = new Map<string, string>();
  private readonly reviews = new Map<string, Review>();

  async createRubric(rubric: Rubric, projectIds: string[]): Promise<void> {
    this.assertUnbound(projectIds);
    this.rubrics.set(rubric.id, clone(rubric));
    for (const p of projectIds) this.bindings.set(p, rubric.id);
  }

  async getRubric(id: string): Promise<Rubric | null> {
    const r = this.rubrics.get(id);
    return r ? clone(r) : null;
  }

  async listRubrics(filter: RubricFilter): Promise<Rubric[]> {
    return [...this.rubrics.values()]
      .filter((r) => (filter.scopeType ? r.scope.type === filter.scopeType : true))
      .filter((r) => (filter.scopeId !== undefined ? r.scope.id === filter.scopeId : true))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(clone);
  }

  async updateRubricIfUnused(rubric: Rubric, projectIds: string[]): Promise<GuardedResult> {
    if (!this.rubrics.has(rubric.id)) return 'not_found';
    if (this.boundTo(rubric.id).length > 0) return 'in_use';
    this.assertUnbound(projectIds);
    this.rubrics.set(rubric.id, clone(rubric));
    for (const p of projectIds) this.bindings.set(p, rubric.id);
    return 'ok';
  }

  async deleteRubricIfUnused(id: string): Promise<GuardedResult> {
    if (!this.rubrics.has(id)) return 'not_found';
    if (this.boundTo(id).length > 0) return 'in_use';
    this.rubrics.delete(id);
    return 'ok';
  }

  async listBoundProjectIds(rubricId: string): Promise<string[]> {
    return this.boundTo(rubricId);
  }

  async getBoundRubricId(projectId: string): Promise<string | null> {
    return this.bindings.get(projectId) ?? null;
  }

  async createReview(review: Review): Promise<void> {
    for (const r of this.reviews.values()) {
      if (r.project_id === review.project_id && r.reviewer_id === review.reviewer_id) {
        throw new DuplicateReviewError();
      }
    }
    this.reviews.set(review.id, clone(review));
  }

  async getReview(projectId: string, reviewId: string): Promise<Review | null> {
    const r = this.reviews.get(reviewId);
    return r && r.project_id === projectId ? clone(r) : null;
  }

  async listReviews(projectIds: string[]): Promise<Review[]> {
    const wanted = new Set(projectIds);
    return [...this.reviews.values()]
      .filter((r) => wanted.has(r.project_id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(clone);
  }

  async updateReview(review: Review): Promise<boolean> {
    const existing = this.reviews.get(review.id);
    if (!existing || existing.project_id !== review.project_id) return false;
    this.reviews.set(review.id, clone(review));
    return true;
  }

  async deleteReview(projectId: string, reviewId: string): Promise<boolean> {
    const existing = this.reviews.get(reviewId);
    if (!existing || existing.project_id !== projectId) return false;
    this.reviews.delete(reviewId);
    return true;
  }

  private boundTo(rubricId: string): string[] {
    return [...this.bindings.entries()].filter(([, r]) => r === rubricId).map(([p]) => p).sort();
  }

  private assertUnbound(projectIds: string[]): void {
    const taken = projectIds.filter((p) => this.bindings.has(p));
    if (taken.length > 0) throw new ProjectAlreadyBoundError(taken);
  }
}
