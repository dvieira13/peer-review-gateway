/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the /api/v1/evaluations/rubrics routes (create with scope binding, list by scope, read, update and delete guarded by the in-use rule).
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; covered by test/rubrics.test.ts; Author ran the stack in Docker Compose and exercised the endpoints with curl (checks 8a to 8j); CI run #34 passed.
 * Confidence: Medium overall. High that the findings in this file (V1 to V4 in the triage report) are real, because the author reproduced them with curl.
 */
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { badRequest, conflict, notFound, unprocessable } from '../errors';
import { presentRubric } from '../domain/presenters';
import type { Rubric, RubricScope } from '../domain/types';
import { isUuid, parseRubricInput, queryString } from '../domain/validation';
import { findCourse } from '../mock/courses';
import { findLab } from '../mock/labs';
import { findProject, projectsInScope } from '../mock/projects';
import type { EvaluationStore } from '../store/store';

/** The scope must name a project, course or lab that exists in the mock data. */
function assertKnownScope(scope: RubricScope): void {
  const known =
    scope.type === 'project' ? findProject(scope.id) : scope.type === 'course' ? findCourse(scope.id) : findLab(scope.id);
  if (!known) throw unprocessable(`Unknown ${scope.type}_id: ${scope.id}`);
}

/** Decision 9: every mock project matching the scope is bound to the rubric. */
const scopeProjectIds = (scope: RubricScope): string[] => projectsInScope(scope.type, scope.id).map((p) => p.id);

export function rubricsRouter(store: EvaluationStore): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const input = parseRubricInput(req.body);
    assertKnownScope(input.scope);
    const now = new Date().toISOString();
    const rubric: Rubric = { id: randomUUID(), ...input, created_at: now, updated_at: now };
    const projectIds = scopeProjectIds(input.scope);
    await store.createRubric(rubric, projectIds);
    res.status(201).location(`/api/v1/evaluations/rubrics/${rubric.id}`).json(presentRubric(rubric, projectIds));
  });

  router.get('/', async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const filters = (
      [
        ['project', queryString(q, 'project_id')],
        ['course', queryString(q, 'course_id')],
        ['lab', queryString(q, 'lab_id')],
      ] as const
    ).filter(([, v]) => v !== undefined);
    if (filters.length > 1) throw badRequest('Use at most one of project_id, course_id or lab_id');
    const [scopeType, scopeId] = filters[0] ?? [undefined, undefined];
    const rubrics = await store.listRubrics({ scopeType, scopeId });
    const data = await Promise.all(rubrics.map(async (r) => presentRubric(r, await store.listBoundProjectIds(r.id))));
    res.json({ count: data.length, data });
  });

  router.get('/:rubric_id', async (req, res) => {
    const id = req.params.rubric_id;
    const rubric = isUuid(id) ? await store.getRubric(id) : null;
    if (!rubric) throw notFound(`Rubric ${id} not found`);
    res.json(presentRubric(rubric, await store.listBoundProjectIds(id)));
  });

  router.put('/:rubric_id', async (req, res) => {
    const id = req.params.rubric_id;
    const existing = isUuid(id) ? await store.getRubric(id) : null;
    if (!existing) throw notFound(`Rubric ${id} not found`);
    const input = parseRubricInput(req.body);
    assertKnownScope(input.scope);
    const updated: Rubric = { ...input, id, created_at: existing.created_at, updated_at: new Date().toISOString() };
    const projectIds = scopeProjectIds(input.scope);
    const result = await store.updateRubricIfUnused(updated, projectIds);
    if (result === 'not_found') throw notFound(`Rubric ${id} not found`);
    if (result === 'in_use') throw conflict('Rubric is in use by at least one project and cannot be modified');
    res.json(presentRubric(updated, projectIds));
  });

  router.delete('/:rubric_id', async (req, res) => {
    const id = req.params.rubric_id;
    const result = isUuid(id) ? await store.deleteRubricIfUnused(id) : 'not_found';
    if (result === 'not_found') throw notFound(`Rubric ${id} not found`);
    if (result === 'in_use') throw conflict('Rubric is in use by at least one project and cannot be deleted');
    res.status(204).end();
  });

  return router;
}
