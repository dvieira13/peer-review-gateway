/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file computes weighted review percentages and the per-role aggregate blocks (mean, std dev, distribution, grade-point trend).
 * AI Contribution: 100%
 * Human Modifications: [to be filled in by the author]
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; covered by test/scoring.test.ts and the summary/report tests
 * Confidence: [to be filled in by the author]
 */
import type { CriterionScore, Review, ReviewerRole, Rubric } from './types';

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const allCriteria = (rubric: Rubric) => rubric.sections.flatMap((s) => s.criteria);

/**
 * Decision 4: overall percentage = sum(weight * points / max_points) / sum(weight) * 100.
 * Weights are relative, so they do not need to add up to any particular total.
 */
export function computeOverallScore(rubric: Rubric, scores: CriterionScore[]): number {
  const byId = new Map(scores.map((s) => [s.criterion_id, s.points]));
  let weighted = 0;
  let totalWeight = 0;
  for (const c of allCriteria(rubric)) {
    const points = byId.get(c.id) ?? 0;
    weighted += c.weight * (points / c.max_points);
    totalWeight += c.weight;
  }
  return totalWeight === 0 ? 0 : round2((weighted / totalWeight) * 100);
}

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export function letterGrade(percent: number): LetterGrade {
  if (percent >= 90) return 'A';
  if (percent >= 80) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 60) return 'D';
  return 'F';
}

const GRADE_POINTS: Record<LetterGrade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export interface CriterionAggregate {
  criterion_id: string;
  description: string;
  weight: number;
  max_points: number;
  mean_points: number | null;
}

export interface TrendPoint {
  submitted_at: string;
  overall_score: number;
  grade_point: number;
  running_mean_grade_point: number;
}

/** One un-conflated statistics block for a single reviewer role (decision 7). */
export interface RoleAggregate {
  reviewer_role: ReviewerRole;
  review_count: number;
  mean_score: number | null;
  std_dev: number | null;
  min_score: number | null;
  max_score: number | null;
  mean_grade_point: number | null;
  grade_distribution: Record<LetterGrade, number>;
  grade_point_trend: TrendPoint[];
  criteria?: CriterionAggregate[];
}

/**
 * Aggregates reviews of ONE role. Reviews of the other role are filtered out here,
 * so callers cannot accidentally mix faculty and peer scores.
 * Pass the rubric to include per-criterion means (only meaningful when every review uses it).
 */
export function aggregateRole(reviews: Review[], role: ReviewerRole, rubric?: Rubric): RoleAggregate {
  const own = reviews
    .filter((r) => r.reviewer_role === role)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const scores = own.map((r) => r.overall_score);
  const n = scores.length;
  const distribution: Record<LetterGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const s of scores) distribution[letterGrade(s)] += 1;

  let mean: number | null = null;
  let std: number | null = null;
  if (n > 0) {
    const m = scores.reduce((a, b) => a + b, 0) / n;
    // Population standard deviation over the reviews received.
    std = round2(Math.sqrt(scores.reduce((a, s) => a + (s - m) ** 2, 0) / n));
    mean = round2(m);
  }

  let gpSum = 0;
  const trend: TrendPoint[] = own.map((r, i) => {
    const gp = GRADE_POINTS[letterGrade(r.overall_score)];
    gpSum += gp;
    return {
      submitted_at: r.created_at,
      overall_score: r.overall_score,
      grade_point: gp,
      running_mean_grade_point: round2(gpSum / (i + 1)),
    };
  });

  const block: RoleAggregate = {
    reviewer_role: role,
    review_count: n,
    mean_score: mean,
    std_dev: std,
    min_score: n > 0 ? Math.min(...scores) : null,
    max_score: n > 0 ? Math.max(...scores) : null,
    mean_grade_point: n > 0 ? round2(gpSum / n) : null,
    grade_distribution: distribution,
    grade_point_trend: trend,
  };

  if (rubric) {
    block.criteria = allCriteria(rubric).map((c) => {
      const pts = own.flatMap((r) => r.scores.filter((s) => s.criterion_id === c.id).map((s) => s.points));
      return {
        criterion_id: c.id,
        description: c.description,
        weight: c.weight,
        max_points: c.max_points,
        mean_points: pts.length > 0 ? round2(pts.reduce((a, b) => a + b, 0) / pts.length) : null,
      };
    });
  }
  return block;
}
