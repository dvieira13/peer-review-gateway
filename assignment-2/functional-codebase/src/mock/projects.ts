/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the static mock projects across two courses and two labs (no cross-service calls).
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; Author ran the stack in Docker Compose and exercised the endpoints with curl (checks 8a to 8j); CI run #34 passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import type { ScopeType } from '../domain/types';

export interface MockProject {
  id: string;
  title: string;
  course_id: string;
  section: string;
  lab_id: string;
  member_ids: string[];
}

export const PROJECTS: readonly MockProject[] = [
  { id: 'proj_101', title: 'Threat Modeling Toolkit', course_id: 'CS501', section: 'A1', lab_id: 'lab_cybersec', member_ids: ['stu_001', 'stu_002'] },
  { id: 'proj_102', title: 'Secure Login Audit', course_id: 'CS501', section: 'A1', lab_id: 'lab_cybersec', member_ids: ['stu_003'] },
  { id: 'proj_103', title: 'Fuzzing Harness for Parsers', course_id: 'CS501', section: 'A2', lab_id: 'lab_ai', member_ids: ['stu_004'] },
  { id: 'proj_104', title: 'Model Drift Monitor', course_id: 'CS640', section: 'A1', lab_id: 'lab_ai', member_ids: ['stu_005'] },
  { id: 'proj_105', title: 'Federated Training Benchmark', course_id: 'CS640', section: 'A1', lab_id: 'lab_ai', member_ids: ['stu_006'] },
  { id: 'proj_106', title: 'Adversarial Malware Classifier', course_id: 'CS640', section: 'A2', lab_id: 'lab_cybersec', member_ids: ['stu_001'] },
];

export const findProject = (id: string): MockProject | undefined => PROJECTS.find((p) => p.id === id);

/** Decision 9: the mock projects a rubric scope binds. */
export const projectsInScope = (type: ScopeType, id: string): MockProject[] =>
  PROJECTS.filter((p) =>
    type === 'project' ? p.id === id : type === 'course' ? p.course_id === id : p.lab_id === id,
  );
