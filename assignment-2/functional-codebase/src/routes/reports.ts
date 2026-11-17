/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds GET /api/v1/evaluations/reports, one consolidated JSON report per course or lab (decision 8) with section, min-score and sort filters.
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; covered by test/reports.test.ts; Author ran the stack in Docker Compose and exercised the endpoints with curl (checks 8a to 8j); CI run #34 passed.
 * Confidence: Medium overall. High that the findings in this file (V1 to V4 in the triage report) are real, because the author reproduced them with curl.
 */
import { Router } from 'express';
import { badRequest, notFound } from '../errors';
import { presentReview } from '../domain/presenters';
import { aggregateRole } from '../domain/scoring';
import type { Review } from '../domain/types';
import { queryEnum, queryMinScore, queryString } from '../domain/validation';
import { findCourse } from '../mock/courses';
import { findLab } from '../mock/labs';
import { PROJECTS } from '../mock/projects';
import type { EvaluationStore } from '../store/store';

type GradingStatus = 'no_rubric' | 'not_started' | 'in_progress' | 'graded';

function gradingStatus(rubricId: string | null, reviews: Review[]): GradingStatus {
  if (!rubricId) return 'no_rubric';
  if (reviews.length === 0) return 'not_started';
  return reviews.some((r) => r.reviewer_role === 'faculty_instructor') ? 'graded' : 'in_progress';
}

export function reportsRouter(store: EvaluationStore): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const courseId = queryString(q, 'course_id');
    const labId = queryString(q, 'lab_id');
    if ((courseId === undefined) === (labId === undefined)) {
      throw badRequest('Exactly one of course_id or lab_id is required');
    }
    const section = queryString(q, 'section');
    // min_score keeps projects whose faculty_instructor mean is at least this value.
    const minScore = queryMinScore(q);
    const sort = queryEnum(q, 'sort', ['project_id', 'faculty_mean', 'peer_mean'] as const) ?? 'project_id';
    const order = queryEnum(q, 'order', ['asc', 'desc'] as const) ?? 'asc';
    const includeReviews = queryEnum(q, 'include_reviews', ['true', 'false'] as const) === 'true';

    let scope: { type: 'course' | 'lab'; id: string; name: string };
    if (courseId !== undefined) {
      const course = findCourse(courseId);
      if (!course) throw notFound(`Course ${courseId} not found`);
      scope = { type: 'course', id: course.id, name: course.title };
    } else {
      const lab = findLab(labId as string);
      if (!lab) throw notFound(`Lab ${labId} not found`);
      scope = { type: 'lab', id: lab.id, name: lab.name };
    }

    const projects = PROJECTS.filter((p) => (scope.type === 'course' ? p.course_id : p.lab_id) === scope.id).filter(
      (p) => (section === undefined ? true : p.section === section),
    );
    const allReviews = await store.listReviews(projects.map((p) => p.id));

    let rows = await Promise.all(
      projects.map(async (p) => {
        const rubricId = await store.getBoundRubricId(p.id);
        const reviews = allReviews.filter((r) => r.project_id === p.id);
        return {
          project_id: p.id,
          title: p.title,
          course_id: p.course_id,
          section: p.section,
          lab_id: p.lab_id,
          rubric_id: rubricId,
          grading_status: gradingStatus(rubricId, reviews),
          faculty_instructor: aggregateRole(reviews, 'faculty_instructor'),
          student_peer: aggregateRole(reviews, 'student_peer'),
          ...(includeReviews ? { reviews: reviews.map(presentReview) } : {}),
        };
      }),
    );

    if (minScore !== undefined) {
      rows = rows.filter((r) => r.faculty_instructor.mean_score !== null && r.faculty_instructor.mean_score >= minScore);
    }
    const key = (r: (typeof rows)[number]): number | string =>
      sort === 'faculty_mean'
        ? (r.faculty_instructor.mean_score ?? -1)
        : sort === 'peer_mean'
          ? (r.student_peer.mean_score ?? -1)
          : r.project_id;
    rows.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      const cmp = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
      return order === 'asc' ? cmp : -cmp;
    });

    const included = new Set(rows.map((r) => r.project_id));
    const includedReviews = allReviews.filter((r) => included.has(r.project_id));
    const statusCounts: Record<GradingStatus, number> = { no_rubric: 0, not_started: 0, in_progress: 0, graded: 0 };
    for (const r of rows) statusCounts[r.grading_status] += 1;

    const report = {
      report_type: scope.type,
      [`${scope.type}_id`]: scope.id,
      name: scope.name,
      filters: { section: section ?? null, min_score: minScore ?? null, sort, order },
      generated_at: new Date().toISOString(),
      project_count: rows.length,
      grading_status_counts: statusCounts,
      // Composite blocks across all included projects, still separated by role.
      totals: {
        faculty_instructor: aggregateRole(includedReviews, 'faculty_instructor'),
        student_peer: aggregateRole(includedReviews, 'student_peer'),
      },
      projects: rows,
    };
    res
      .set('Content-Disposition', `attachment; filename="evaluation-report-${scope.type}-${scope.id}.json"`)
      .json(report);
  });

  return router;
}
