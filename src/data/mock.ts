/**
 * AI Contribution Weight: [100%] AI Generated / [0%] Human Refactored
 * File: src/data/mock.ts - static mock data (no external services; see spec.md section 9)
 * AI tool: Claude (claude.ai chat, Claude Sonnet 5.5) 2026-11-01
 */
export interface Criterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number; // percentage; all criteria in a rubric sum to 100
}

export interface Rubric {
  id: string;
  title: string;
  description: string;
  criteria: Criterion[];
  createdBy: string;
  createdAt: string;
}

export const rubrics: Rubric[] = [
  {
    id: 'rub-001',
    title: 'Capstone Project Rubric',
    description: 'Standard rubric for course capstone projects.',
    createdBy: 'usr-inst-01',
    createdAt: '2026-09-01T12:00:00Z',
    criteria: [
      { id: 'crit-001', name: 'Technical Quality', description: 'Correctness and soundness of the implementation.', maxScore: 10, weight: 40 },
      { id: 'crit-002', name: 'Innovation', description: 'Originality of the approach.', maxScore: 10, weight: 20 },
      { id: 'crit-003', name: 'Documentation', description: 'Clarity of README, design docs, and demo.', maxScore: 10, weight: 20 },
      { id: 'crit-004', name: 'Presentation', description: 'Quality of the final presentation.', maxScore: 10, weight: 20 },
    ],
  },
];
