/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the static mock courses (no cross-service calls).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16
 * Confidence: [to be filled in by the author]
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
