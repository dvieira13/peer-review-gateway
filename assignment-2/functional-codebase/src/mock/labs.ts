/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file holds the static mock research labs (no cross-service calls).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16
 * Confidence: [to be filled in by the author]
 */

export interface MockLab {
  id: string;
  name: string;
}

export const LABS: readonly MockLab[] = [
  { id: 'lab_cybersec', name: 'Cybersecurity Research Lab' },
  { id: 'lab_ai', name: 'Applied AI Lab' },
];

export const findLab = (id: string): MockLab | undefined => LABS.find((l) => l.id === id);
