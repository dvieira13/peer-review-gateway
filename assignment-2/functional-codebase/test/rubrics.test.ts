/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file tests the rubric endpoints end to end (create, read, scope filters, project binding, binding conflicts, rubric-in-use rule).
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: run by Claude Code with npm test on 2026-11-16; CI run #34 ran this suite and it passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BASE, createRubric, makeApp, rubricBody } from './helpers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('POST/GET /rubrics', () => {
  it('creates a course-scoped rubric, binds every matching project and reads it back', async () => {
    const { app } = makeApp();
    const res = await request(app).post(`${BASE}/rubrics`).send(rubricBody({ course_id: 'CS501' }));
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(UUID_RE);
    expect(res.headers.location).toBe(`${BASE}/rubrics/${res.body.id}`);
    expect(res.body.scope).toEqual({ type: 'course', id: 'CS501' });
    expect(res.body.bound_project_ids).toEqual(['proj_101', 'proj_102', 'proj_103']);
    expect(res.body.in_use).toBe(true);
    expect(res.body.sections).toHaveLength(2);
    for (const c of res.body.sections.flatMap((s: { criteria: { id: string }[] }) => s.criteria)) {
      expect(c.id).toMatch(UUID_RE);
    }

    const read = await request(app).get(`${BASE}/rubrics/${res.body.id}`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual(res.body);
  });

  it('binds a lab-scoped rubric to projects across courses, and a project-scoped rubric to one project', async () => {
    const { app } = makeApp();
    const lab = await createRubric(app, { lab_id: 'lab_cybersec' });
    expect(lab.bound_project_ids).toEqual(['proj_101', 'proj_102', 'proj_106']);
    const single = await createRubric(app, { project_id: 'proj_104' });
    expect(single.bound_project_ids).toEqual(['proj_104']);
  });

  it('lists rubrics filtered by project_id, course_id or lab_id', async () => {
    const { app } = makeApp();
    const course = await createRubric(app, { course_id: 'CS501' });
    const project = await createRubric(app, { project_id: 'proj_104' });

    const all = await request(app).get(`${BASE}/rubrics`);
    expect(all.body.count).toBe(2);

    const byCourse = await request(app).get(`${BASE}/rubrics?course_id=CS501`);
    expect(byCourse.body.data.map((r: { id: string }) => r.id)).toEqual([course.id]);

    const byProject = await request(app).get(`${BASE}/rubrics?project_id=proj_104`);
    expect(byProject.body.data.map((r: { id: string }) => r.id)).toEqual([project.id]);

    const byLab = await request(app).get(`${BASE}/rubrics?lab_id=lab_ai`);
    expect(byLab.body.count).toBe(0);

    const twoFilters = await request(app).get(`${BASE}/rubrics?course_id=CS501&lab_id=lab_ai`);
    expect(twoFilters.status).toBe(400);
  });

  it('rejects a rubric when a matching project already has one (409) and stores nothing', async () => {
    const { app } = makeApp();
    await createRubric(app, { course_id: 'CS501' });
    const res = await request(app).post(`${BASE}/rubrics`).send(rubricBody({ lab_id: 'lab_cybersec' }));
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual(['proj_101', 'proj_102']);

    const labRubrics = await request(app).get(`${BASE}/rubrics?lab_id=lab_cybersec`);
    expect(labRubrics.body.count).toBe(0);
    // proj_106 must not have been bound by the rejected request.
    const p106 = await request(app).post(`${BASE}/rubrics`).send(rubricBody({ project_id: 'proj_106' }));
    expect(p106.status).toBe(201);
  });

  it('validates the body (400) and unknown scope ids (422)', async () => {
    const { app } = makeApp();
    const noSections = await request(app).post(`${BASE}/rubrics`).send({ name: 'x', course_id: 'CS501' });
    expect(noSections.status).toBe(400);

    const twoScopes = await request(app)
      .post(`${BASE}/rubrics`)
      .send({ ...rubricBody({ course_id: 'CS501' }), lab_id: 'lab_ai' });
    expect(twoScopes.status).toBe(400);

    const badWeight = rubricBody({ course_id: 'CS501' });
    badWeight.sections[0].criteria[0].weight = 0;
    const weight = await request(app).post(`${BASE}/rubrics`).send(badWeight);
    expect(weight.status).toBe(400);
    expect(weight.body.error.details).toContain('sections[0].criteria[0].weight must be a number greater than 0');

    const unknown = await request(app).post(`${BASE}/rubrics`).send(rubricBody({ course_id: 'CS999' }));
    expect(unknown.status).toBe(422);

    const malformed = await request(app)
      .post(`${BASE}/rubrics`)
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(malformed.status).toBe(400);
  });

  it('returns 404 for unknown or malformed rubric ids', async () => {
    const { app } = makeApp();
    expect((await request(app).get(`${BASE}/rubrics/not-a-uuid`)).status).toBe(404);
    expect((await request(app).get(`${BASE}/rubrics/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
    expect((await request(app).delete(`${BASE}/rubrics/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
  });
});

describe('rubric-in-use rule (decision 1)', () => {
  it('rejects PUT and DELETE with 409 when a project is bound to the rubric', async () => {
    const { app } = makeApp();
    const rubric = await createRubric(app, { course_id: 'CS501' });

    const put = await request(app)
      .put(`${BASE}/rubrics/${rubric.id}`)
      .send(rubricBody({ course_id: 'CS501' }, 'Renamed'));
    expect(put.status).toBe(409);

    const del = await request(app).delete(`${BASE}/rubrics/${rubric.id}`);
    expect(del.status).toBe(409);

    const read = await request(app).get(`${BASE}/rubrics/${rubric.id}`);
    expect(read.body.name).toBe('Capstone rubric');
  });

  it('allows PUT and DELETE while no project is bound', async () => {
    const { app } = makeApp();
    // CS790 has no projects in the mock data, so the rubric binds nothing.
    const rubric = await createRubric(app, { course_id: 'CS790' });
    expect(rubric.in_use).toBe(false);

    const put = await request(app)
      .put(`${BASE}/rubrics/${rubric.id}`)
      .send(rubricBody({ course_id: 'CS790' }, 'Renamed'));
    expect(put.status).toBe(200);
    expect(put.body.name).toBe('Renamed');
    expect(put.body.in_use).toBe(false);

    const del = await request(app).delete(`${BASE}/rubrics/${rubric.id}`);
    expect(del.status).toBe(204);
    expect((await request(app).get(`${BASE}/rubrics/${rubric.id}`)).status).toBe(404);
  });

  it('binds projects when an unused rubric is re-scoped, after which it is in use', async () => {
    const { app } = makeApp();
    const rubric = await createRubric(app, { course_id: 'CS790' });
    const put = await request(app)
      .put(`${BASE}/rubrics/${rubric.id}`)
      .send(rubricBody({ project_id: 'proj_104' }));
    expect(put.status).toBe(200);
    expect(put.body.bound_project_ids).toEqual(['proj_104']);
    expect((await request(app).delete(`${BASE}/rubrics/${rubric.id}`)).status).toBe(409);
  });
});
