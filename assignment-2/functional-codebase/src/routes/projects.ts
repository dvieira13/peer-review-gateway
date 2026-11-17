/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the /api/v1/evaluations/projects/{project_id} routes (summary with separate faculty/peer blocks, and review submit/list/read/update/delete with verification constraints).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; covered by test/reviews.test.ts and test/summary.test.ts
 * Confidence: [to be filled in by the author]
 */
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { notFound, unprocessable } from '../errors';
import { presentReview } from '../domain/presenters';
import { aggregateRole, allCriteria, computeOverallScore } from '../domain/scoring';
import { REVIEWER_ROLES, type Review, type Rubric } from '../domain/types';
import {
  isUuid,
  parseReviewInput,
  parseReviewUpdate,
  queryEnum,
  queryMinScore,
  type ScoreInput,
} from '../domain/validation';
import { findProject, type MockProject } from '../mock/projects';
import { findUser } from '../mock/users';
import type { EvaluationStore } from '../store/store';

function requireProject(id: string): MockProject {
  const project = findProject(id);
  if (!project) throw notFound(`Project ${id} not found`);
  return project;
}

/** Every criterion of the rubric must be scored exactly once, within 0..max_points. */
function assertScoresMatchRubric(rubric: Rubric, scores: ScoreInput[]): void {
  const errors: string[] = [];
  const criteria = new Map(allCriteria(rubric).map((c) => [c.id, c]));
  const seen = new Set<string>();
  for (const s of scores) {
    const c = criteria.get(s.criterion_id);
    if (!c) {
      errors.push(`criterion ${s.criterion_id} is not part of rubric ${rubric.id}`);
      continue;
    }
    if (seen.has(s.criterion_id)) errors.push(`criterion ${s.criterion_id} is scored more than once`);
    seen.add(s.criterion_id);
    if (s.points > c.max_points) {
      errors.push(`criterion ${s.criterion_id}: points ${s.points} exceed max_points ${c.max_points}`);
    }
  }
  for (const id of criteria.keys()) {
    if (!seen.has(id)) errors.push(`criterion ${id} has no score`);
  }
  if (errors.length > 0) throw unprocessable('Scores do not match the rubric', errors);
}

export function projectsRouter(store: EvaluationStore): Router {
  const router = Router();

  async function governingRubric(projectId: string): Promise<Rubric | null> {
    const rubricId = await store.getBoundRubricId(projectId);
    return rubricId ? store.getRubric(rubricId) : null;
  }

  router.get('/:project_id/summary', async (req, res) => {
    const project = requireProject(req.params.project_id);
    const rubric = await governingRubric(project.id);
    const reviews = await store.listReviews([project.id]);
    // Decision 7: two separate blocks, never combined into one score.
    res.json({
      project_id: project.id,
      title: project.title,
      course_id: project.course_id,
      section: project.section,
      lab_id: project.lab_id,
      rubric_id: rubric?.id ?? null,
      faculty_instructor: aggregateRole(reviews, 'faculty_instructor', rubric ?? undefined),
      student_peer: aggregateRole(reviews, 'student_peer', rubric ?? undefined),
    });
  });

  router.post('/:project_id/reviews', async (req, res) => {
    const project = requireProject(req.params.project_id);
    const input = parseReviewInput(req.body);

    const rubric = await governingRubric(project.id);
    if (!rubric) throw unprocessable(`Project ${project.id} has no governing rubric`);
    if (input.rubric_id !== rubric.id) {
      throw unprocessable(`rubric_id must be ${rubric.id}, the rubric that governs project ${project.id}`);
    }

    // Verification constraints on the reviewer (mock users are the identity source).
    const user = findUser(input.reviewer_id);
    if (!user) throw unprocessable(`Unknown reviewer_id: ${input.reviewer_id}`);
    if (user.role !== input.reviewer_role) {
      throw unprocessable(`reviewer_role ${input.reviewer_role} does not match the reviewer's role`);
    }
    if (input.reviewer_role === 'student_peer' && project.member_ids.includes(user.id)) {
      throw unprocessable('A student_peer cannot review a project they are a member of');
    }
    assertScoresMatchRubric(rubric, input.scores);

    const now = new Date().toISOString();
    const review: Review = {
      id: randomUUID(),
      project_id: project.id,
      rubric_id: rubric.id,
      reviewer_id: user.id,
      reviewer_role: input.reviewer_role,
      scores: input.scores,
      comments: input.comments,
      overall_score: computeOverallScore(rubric, input.scores),
      created_at: now,
      updated_at: now,
    };
    await store.createReview(review);
    res
      .status(201)
      .location(`/api/v1/evaluations/projects/${project.id}/reviews/${review.id}`)
      .json(presentReview(review));
  });

  router.get('/:project_id/reviews', async (req, res) => {
    const project = requireProject(req.params.project_id);
    const q = req.query as Record<string, unknown>;
    const minScore = queryMinScore(q);
    const role = queryEnum(q, 'reviewer_role', REVIEWER_ROLES);
    const sort = queryEnum(q, 'sort', ['created_at', 'overall_score'] as const) ?? 'created_at';
    const order = queryEnum(q, 'order', ['asc', 'desc'] as const) ?? 'asc';

    let reviews = await store.listReviews([project.id]);
    if (minScore !== undefined) reviews = reviews.filter((r) => r.overall_score >= minScore);
    if (role) reviews = reviews.filter((r) => r.reviewer_role === role);
    reviews.sort((a, b) => {
      const cmp =
        sort === 'overall_score' ? a.overall_score - b.overall_score : a.created_at.localeCompare(b.created_at);
      return order === 'asc' ? cmp : -cmp;
    });
    res.json({ project_id: project.id, count: reviews.length, data: reviews.map(presentReview) });
  });

  async function requireReview(projectId: string, reviewId: string): Promise<Review> {
    const review = isUuid(reviewId) ? await store.getReview(projectId, reviewId) : null;
    if (!review) throw notFound(`Review ${reviewId} not found for project ${projectId}`);
    return review;
  }

  router.get('/:project_id/reviews/:review_id', async (req, res) => {
    const project = requireProject(req.params.project_id);
    res.json(presentReview(await requireReview(project.id, req.params.review_id)));
  });

  router.put('/:project_id/reviews/:review_id', async (req, res) => {
    const project = requireProject(req.params.project_id);
    const existing = await requireReview(project.id, req.params.review_id);
    const input = parseReviewUpdate(req.body, existing);
    const rubric = await store.getRubric(existing.rubric_id);
    if (!rubric) throw unprocessable(`Rubric ${existing.rubric_id} no longer exists`);
    assertScoresMatchRubric(rubric, input.scores);
    const updated: Review = {
      ...existing,
      scores: input.scores,
      comments: input.comments,
      overall_score: computeOverallScore(rubric, input.scores),
      updated_at: new Date().toISOString(),
    };
    if (!(await store.updateReview(updated))) throw notFound(`Review ${existing.id} not found`);
    res.json(presentReview(updated));
  });

  router.delete('/:project_id/reviews/:review_id', async (req, res) => {
    const project = requireProject(req.params.project_id);
    const id = req.params.review_id;
    const deleted = isUuid(id) ? await store.deleteReview(project.id, id) : false;
    if (!deleted) throw notFound(`Review ${id} not found for project ${project.id}`);
    res.status(204).end();
  });

  return router;
}
