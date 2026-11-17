/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file tests GET /reports with course and lab filters, section, min-score and sort options, and grading status.
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: run by Claude Code with npm test on 2026-11-16
 * Confidence: [to be filled in by the author]
 */
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { BASE, createRubric, makeApp, P59, P78, P82, P94, reviewBody, submitReview } from './helpers';

type Row = { project_id: string; grading_status: string; faculty_instructor: { mean_score: number | null } };
const ids = (body: { projects: Row[] }) => body.projects.map((p) => p.project_id);

describe('GET /reports', () => {
  let app: ReturnType<typeof makeApp>['app'];

  beforeEach(async () => {
    app = makeApp().app;
    const cs501 = await createRubric(app, { course_id: 'CS501' });
    const cs640 = await createRubric(app, { course_id: 'CS640' });
    await submitReview(app, 'proj_101', reviewBody(cs501, 'fac_001', 'faculty_instructor', P94));
    await submitReview(app, 'proj_101', reviewBody(cs501, 'stu_003', 'student_peer', P78));
    await submitReview(app, 'proj_102', reviewBody(cs501, 'fac_001', 'faculty_instructor', P59));
    await submitReview(app, 'proj_104', reviewBody(cs640, 'stu_001', 'student_peer', P82));
    await submitReview(app, 'proj_106', reviewBody(cs640, 'fac_002', 'faculty_instructor', P82));
  });

  it('returns one consolidated report for a course', async () => {
    const res = await request(app).get(`${BASE}/reports?course_id=CS501`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toBe('attachment; filename="evaluation-report-course-CS501.json"');
    expect(res.body).toMatchObject({ report_type: 'course', course_id: 'CS501', project_count: 3 });
    expect(ids(res.body)).toEqual(['proj_101', 'proj_102', 'proj_103']);
    expect(res.body.projects.map((p: Row) => p.grading_status)).toEqual(['graded', 'graded', 'not_started']);
    expect(res.body.grading_status_counts).toEqual({ no_rubric: 0, not_started: 1, in_progress: 0, graded: 2 });
    expect(res.body.totals.faculty_instructor).toMatchObject({ review_count: 2, mean_score: 76.5 });
    expect(res.body.totals.student_peer).toMatchObject({ review_count: 1, mean_score: 78 });
    expect(res.body.projects[0].faculty_instructor.mean_score).toBe(94);
    expect(res.body.projects[0].student_peer.mean_score).toBe(78);
  });

  it('returns one consolidated report for a lab, spanning courses', async () => {
    const res = await request(app).get(`${BASE}/reports?lab_id=lab_cybersec`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ report_type: 'lab', lab_id: 'lab_cybersec', project_count: 3 });
    expect(ids(res.body)).toEqual(['proj_101', 'proj_102', 'proj_106']);
    expect(res.body.totals.faculty_instructor.review_count).toBe(3);

    const ai = await request(app).get(`${BASE}/reports?lab_id=lab_ai`);
    expect(ids(ai.body)).toEqual(['proj_103', 'proj_104', 'proj_105']);
    expect(ai.body.projects[1].grading_status).toBe('in_progress');
  });

  it('filters by section and minimum faculty mean, and sorts', async () => {
    const section = await request(app).get(`${BASE}/reports?course_id=CS501&section=A2`);
    expect(ids(section.body)).toEqual(['proj_103']);

    const min = await request(app).get(`${BASE}/reports?course_id=CS501&min_score=80`);
    expect(ids(min.body)).toEqual(['proj_101']);
    expect(min.body.totals.faculty_instructor.review_count).toBe(1);

    const sorted = await request(app).get(`${BASE}/reports?lab_id=lab_cybersec&sort=faculty_mean&order=desc`);
    expect(ids(sorted.body)).toEqual(['proj_101', 'proj_106', 'proj_102']);
  });

  it('can include raw reviews, keeping peer reviewers anonymous', async () => {
    const res = await request(app).get(`${BASE}/reports?course_id=CS501&include_reviews=true`);
    const reviews = res.body.projects[0].reviews;
    expect(reviews).toHaveLength(2);
    expect(reviews.find((r: { reviewer_role: string }) => r.reviewer_role === 'student_peer')).not.toHaveProperty('reviewer_id');
    expect(JSON.stringify(res.body)).not.toContain('stu_003');
  });

  it('reports projects with no rubric', async () => {
    const fresh = makeApp().app;
    const res = await request(fresh).get(`${BASE}/reports?course_id=CS640`);
    expect(res.body.grading_status_counts.no_rubric).toBe(3);
  });

  it('requires exactly one known course_id or lab_id', async () => {
    expect((await request(app).get(`${BASE}/reports`)).status).toBe(400);
    expect((await request(app).get(`${BASE}/reports?course_id=CS501&lab_id=lab_ai`)).status).toBe(400);
    expect((await request(app).get(`${BASE}/reports?course_id=CS999`)).status).toBe(404);
    expect((await request(app).get(`${BASE}/reports?lab_id=lab_none`)).status).toBe(404);
  });
});
