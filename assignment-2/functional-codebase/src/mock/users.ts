/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the static mock users (no cross-service calls).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16
 * Confidence: [to be filled in by the author]
 */
import type { ReviewerRole } from '../domain/types';

export interface MockUser {
  id: string;
  name: string;
  role: ReviewerRole;
}

export const USERS: readonly MockUser[] = [
  { id: 'fac_001', name: 'Prof. Ada Hopper', role: 'faculty_instructor' },
  { id: 'fac_002', name: 'Dr. Alan Lovelace', role: 'faculty_instructor' },
  { id: 'stu_001', name: 'Student One', role: 'student_peer' },
  { id: 'stu_002', name: 'Student Two', role: 'student_peer' },
  { id: 'stu_003', name: 'Student Three', role: 'student_peer' },
  { id: 'stu_004', name: 'Student Four', role: 'student_peer' },
  { id: 'stu_005', name: 'Student Five', role: 'student_peer' },
  { id: 'stu_006', name: 'Student Six', role: 'student_peer' },
];

export const findUser = (id: string): MockUser | undefined => USERS.find((u) => u.id === id);
