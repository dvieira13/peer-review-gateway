/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file tests GET /projects/{project_id}/summary, which returns separate, un-conflated faculty and peer blocks.
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: run by Claude Code with npm test on 2026-11-16; CI run #34 ran this suite and it passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BASE, createRubric, makeApp, P59, P78, P82, P94, reviewBody, submitReview } from './helpers';

describe('GET /projects/{project_id}/summary', () => {
  it('returns separate faculty_instructor and student_peer blocks', async () => {
    const { app } = makeApp();
    const rubric = await createRubric(app, { course_id: 'CS501' });
    await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_001', 'faculty_instructor', P94));
    await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_002', 'faculty_instructor', P82));
    await submitReview(app, 'proj_101', reviewBody(rubric, 'stu_003', 'student_peer', P78));
    await submitReview(app, 'proj_101', reviewBody(rubric, 'stu_004', 'student_peer', P59));
    // A review of another project must not leak into this summary.
    await submitReview(app, 'proj_102', reviewBody(rubric, 'fac_001', 'faculty_instructor', P59));

    const res = await request(app).get(`${BASE}/projects/proj_101/summary`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ project_id: 'proj_101', course_id: 'CS501', lab_id: 'lab_cybersec', rubric_id: rubric.id });

    const faculty = res.body.faculty_instructor;
    expect(faculty).toMatchObject({
      reviewer_role: 'faculty_instructor',
      review_count: 2,
      mean_score: 88,
      std_dev: 6,
      min_score: 82,
      max_score: 94,
      mean_grade_point: 3.5,
      grade_distribution: { A: 1, B: 1, C: 0, D: 0, F: 0 },
    });
    expect(faculty.grade_point_trend.map((t: { running_mean_grade_point: number }) => t.running_mean_grade_point)).toEqual([4, 3.5]);
    expect(faculty.criteria).toHaveLength(3);
    expect(faculty.criteria[0].mean_points).toBe(9.5);

    const peer = res.body.student_peer;
    expect(peer).toMatchObject({
      reviewer_role: 'student_peer',
      review_count: 2,
      mean_score: 68.5,
      std_dev: 9.5,
      mean_grade_point: 1,
      grade_distribution: { A: 0, B: 0, C: 1, D: 0, F: 1 },
    });

    // No combined score anywhere at the top level.
    expect(Object.keys(res.body).sort()).toEqual(
      ['course_id', 'faculty_instructor', 'lab_id', 'project_id', 'rubric_id', 'section', 'student_peer', 'title'].sort(),
    );
    expect(JSON.stringify(res.body)).not.toContain('stu_003');
  });

  it('returns empty blocks for a project without reviews or rubric, and 404 for an unknown project', async () => {
    const { app } = makeApp();
    const res = await request(app).get(`${BASE}/projects/proj_104/summary`);
    expect(res.status).toBe(200);
    expect(res.body.rubric_id).toBeNull();
    for (const block of [res.body.faculty_instructor, res.body.student_peer]) {
      expect(block).toMatchObject({ review_count: 0, mean_score: null, std_dev: null, mean_grade_point: null });
    }
    expect((await request(app).get(`${BASE}/projects/proj_999/summary`)).status).toBe(404);
  });
});
