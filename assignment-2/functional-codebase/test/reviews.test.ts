/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file tests the review endpoints end to end (faculty and peer submission, anonymity, verification constraints, min-grade filter, update and delete).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: run by Claude Code with npm test on 2026-11-16
 * Confidence: [to be filled in by the author]
 */
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BASE,
  createRubric,
  makeApp,
  P59,
  P78,
  P94,
  reviewBody,
  scores,
  submitReview,
  type RubricResponse,
} from './helpers';

let app: ReturnType<typeof makeApp>['app'];
let rubric: RubricResponse;
const reviews = (p: string) => `${BASE}/projects/${p}/reviews`;

beforeEach(async () => {
  app = makeApp().app;
  rubric = await createRubric(app, { course_id: 'CS501' });
});

describe('POST /projects/{project_id}/reviews', () => {
  it('stores a faculty review with its weighted percentage and reviewer_id', async () => {
    const res = await request(app).post(reviews('proj_101')).send(reviewBody(rubric, 'fac_001', 'faculty_instructor', P78));
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`${reviews('proj_101')}/${res.body.id}`);
    expect(res.body.overall_score).toBe(78);
    expect(res.body.reviewer_id).toBe('fac_001');
    expect(res.body.reviewer_role).toBe('faculty_instructor');
    expect(res.body.rubric_id).toBe(rubric.id);
  });

  it('never returns reviewer_id for student_peer reviews (decision 6)', async () => {
    const created = await submitReview(app, 'proj_101', reviewBody(rubric, 'stu_003', 'student_peer', P94));
    expect(created).not.toHaveProperty('reviewer_id');

    const one = await request(app).get(`${reviews('proj_101')}/${created.id}`);
    expect(one.status).toBe(200);
    expect(one.body).not.toHaveProperty('reviewer_id');

    const list = await request(app).get(reviews('proj_101'));
    expect(list.body.data[0]).not.toHaveProperty('reviewer_id');
    expect(JSON.stringify(list.body)).not.toContain('stu_003');
  });

  it('enforces verification constraints', async () => {
    const post = (project: string, body: object) => request(app).post(reviews(project)).send(body);

    // Claimed role does not match the mock user's role.
    expect((await post('proj_101', reviewBody(rubric, 'stu_003', 'faculty_instructor', P78))).status).toBe(422);
    // Unknown reviewer.
    expect((await post('proj_101', reviewBody(rubric, 'ghost', 'faculty_instructor', P78))).status).toBe(422);
    // Peer reviewing their own project.
    expect((await post('proj_101', reviewBody(rubric, 'stu_001', 'student_peer', P78))).status).toBe(422);
    // rubric_id is not the project's governing rubric.
    const wrongRubric = { ...reviewBody(rubric, 'fac_001', 'faculty_instructor', P78), rubric_id: '00000000-0000-4000-8000-000000000000' };
    expect((await post('proj_101', wrongRubric)).status).toBe(422);
    // A criterion is missing.
    const missing = { ...reviewBody(rubric, 'fac_001', 'faculty_instructor', P78) };
    missing.scores = missing.scores.slice(1);
    expect((await post('proj_101', missing)).status).toBe(422);
    // Points above max_points.
    const tooHigh = await post('proj_101', reviewBody(rubric, 'fac_001', 'faculty_instructor', [11, 5, 20]));
    expect(tooHigh.status).toBe(422);
    expect(tooHigh.body.error.details[0]).toContain('exceed max_points');
    // Invalid role value / missing fields.
    expect((await post('proj_101', { ...reviewBody(rubric, 'fac_001', 'faculty_instructor', P78), reviewer_role: 'ta' })).status).toBe(400);
    expect((await post('proj_101', {})).status).toBe(400);
    // Project with no governing rubric, and an unknown project.
    expect((await post('proj_104', reviewBody(rubric, 'fac_001', 'faculty_instructor', P78))).status).toBe(422);
    expect((await post('proj_999', reviewBody(rubric, 'fac_001', 'faculty_instructor', P78))).status).toBe(404);
  });

  it('rejects a second review by the same reviewer for the same project (409)', async () => {
    await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_001', 'faculty_instructor', P78));
    const again = await request(app).post(reviews('proj_101')).send(reviewBody(rubric, 'fac_001', 'faculty_instructor', P94));
    expect(again.status).toBe(409);
  });
});

describe('GET /projects/{project_id}/reviews', () => {
  beforeEach(async () => {
    await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_001', 'faculty_instructor', P78));
    await submitReview(app, 'proj_101', reviewBody(rubric, 'stu_003', 'student_peer', P59));
    await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_002', 'faculty_instructor', P94));
    await submitReview(app, 'proj_102', reviewBody(rubric, 'fac_001', 'faculty_instructor', P94));
  });

  const listScores = (body: { data: { overall_score: number }[] }) => body.data.map((r) => r.overall_score);

  it('returns only the reviews of that project', async () => {
    const res = await request(app).get(reviews('proj_101'));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    expect(listScores(res.body)).toEqual([78, 59, 94]);
  });

  it('filters by minimum grade (overall percentage)', async () => {
    const res = await request(app).get(`${reviews('proj_101')}?min_score=75`);
    expect(listScores(res.body)).toEqual([78, 94]);
    const exact = await request(app).get(`${reviews('proj_101')}?min_score=94`);
    expect(listScores(exact.body)).toEqual([94]);
  });

  it('filters by role and sorts by score', async () => {
    const res = await request(app).get(`${reviews('proj_101')}?reviewer_role=faculty_instructor&sort=overall_score&order=desc`);
    expect(listScores(res.body)).toEqual([94, 78]);
  });

  it('rejects invalid query values with 400', async () => {
    expect((await request(app).get(`${reviews('proj_101')}?min_score=abc`)).status).toBe(400);
    expect((await request(app).get(`${reviews('proj_101')}?min_score=101`)).status).toBe(400);
    expect((await request(app).get(`${reviews('proj_101')}?min_score=1&min_score=2`)).status).toBe(400);
    expect((await request(app).get(`${reviews('proj_101')}?sort=name`)).status).toBe(400);
    expect((await request(app).get(reviews('proj_999'))).status).toBe(404);
  });
});

describe('GET/PUT/DELETE /projects/{project_id}/reviews/{review_id}', () => {
  it('updates scores and recomputes the percentage, then deletes', async () => {
    const created = await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_001', 'faculty_instructor', P78));
    const url = `${reviews('proj_101')}/${created.id}`;

    const put = await request(app).put(url).send({ scores: scores(rubric, P94), comments: 'Revised' });
    expect(put.status).toBe(200);
    expect(put.body.overall_score).toBe(94);
    expect(put.body.comments).toBe('Revised');
    expect((await request(app).get(url)).body.overall_score).toBe(94);

    const del = await request(app).delete(url);
    expect(del.status).toBe(204);
    expect((await request(app).get(url)).status).toBe(404);
    expect((await request(app).delete(url)).status).toBe(404);
  });

  it('does not allow changing the reviewer, and validates scores on update', async () => {
    const created = await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_001', 'faculty_instructor', P78));
    const url = `${reviews('proj_101')}/${created.id}`;
    const changeReviewer = await request(app).put(url).send({ reviewer_id: 'fac_002', scores: scores(rubric, P94) });
    expect(changeReviewer.status).toBe(400);
    const tooHigh = await request(app).put(url).send({ scores: scores(rubric, [10, 6, 20]) });
    expect(tooHigh.status).toBe(422);
  });

  it('returns 404 when the review belongs to another project or the id is malformed', async () => {
    const created = await submitReview(app, 'proj_101', reviewBody(rubric, 'fac_001', 'faculty_instructor', P78));
    expect((await request(app).get(`${reviews('proj_102')}/${created.id}`)).status).toBe(404);
    expect((await request(app).get(`${reviews('proj_101')}/not-a-uuid`)).status).toBe(404);
  });
});
