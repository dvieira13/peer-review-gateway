/**
 * AI Contribution Weight: [100%] AI Generated / [0%] Human Refactored
 * File: src/data/works.ts - static mock published works (no external services; see spec.md section 9)
 * AI tool: Claude Code / claude-opus-5-5 / 2026-11-02
 */
export interface Work {
  id: string;
  title: string;
  ownerIds: string[];
  courseId: string;
  publishedAt: string;
}

export const works: Work[] = [
  {
    id: 'work-001',
    title: 'Smart Campus Energy Dashboard',
    ownerIds: ['usr-stu-01'],
    courseId: 'CS701',
    publishedAt: '2026-10-20T00:00:00Z',
  },
  {
    id: 'work-002',
    title: 'Accessible Transit Planner',
    ownerIds: ['usr-stu-02', 'usr-stu-03'],
    courseId: 'CS701',
    publishedAt: '2026-10-22T00:00:00Z',
  },
];
