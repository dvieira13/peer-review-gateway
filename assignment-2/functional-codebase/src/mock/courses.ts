/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the static mock courses (no cross-service calls).
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; Author ran the stack in Docker Compose and exercised the endpoints with curl (checks 8a to 8j); CI run #34 passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */

export interface MockCourse {
  id: string;
  title: string;
  sections: string[];
}

export const COURSES: readonly MockCourse[] = [
  { id: 'CS501', title: 'Secure Software Engineering', sections: ['A1', 'A2'] },
  { id: 'CS640', title: 'Machine Learning Systems', sections: ['A1', 'A2'] },
  // Upcoming course with no projects yet: a rubric scoped here binds no project,
  // so it is not "in use" (decision 1) and can still be updated or deleted.
  { id: 'CS790', title: 'Graduate Research Seminar', sections: ['A1'] },
];

export const findCourse = (id: string): MockCourse | undefined => COURSES.find((c) => c.id === id);
