/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file is the PostgreSQL 17 EvaluationStore, which creates its tables at startup and enforces one rubric per project in the schema.
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck and build run by Claude Code on 2026-11-16; NOT covered by the Vitest suite (tests use MemoryStore per decision 3), so it needs a manual check with docker compose; Not covered by unit tests (0% in the Sonar report); exercised by the Docker Compose smoke test and curl checks 8a to 8j.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import { Pool, type PoolClient } from 'pg';
import { DuplicateReviewError, ProjectAlreadyBoundError } from '../errors';
import type { Review, ReviewerRole, Rubric, RubricSection, ScopeType } from '../domain/types';
import type { EvaluationStore, GuardedResult, RubricFilter } from './store';

/*
 * project_rubric_bindings.project_id is the PRIMARY KEY, so the database itself
 * guarantees each project has exactly one governing rubric, while one rubric can
 * govern many projects. Reviews reference (project_id, rubric_id) of a binding, so
 * a review can only target the rubric that governs its project.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS rubrics (
  id          uuid PRIMARY KEY,
  name        text NOT NULL,
  description text,
  scope_type  text NOT NULL CHECK (scope_type IN ('project', 'course', 'lab')),
  scope_id    text NOT NULL,
  sections    jsonb NOT NULL,
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rubrics_scope_idx ON rubrics (scope_type, scope_id);

CREATE TABLE IF NOT EXISTS project_rubric_bindings (
  project_id text PRIMARY KEY,
  rubric_id  uuid NOT NULL REFERENCES rubrics (id) ON DELETE RESTRICT,
  CONSTRAINT project_rubric_bindings_pair_key UNIQUE (project_id, rubric_id)
);
CREATE INDEX IF NOT EXISTS project_rubric_bindings_rubric_idx ON project_rubric_bindings (rubric_id);

CREATE TABLE IF NOT EXISTS reviews (
  id            uuid PRIMARY KEY,
  project_id    text NOT NULL,
  rubric_id     uuid NOT NULL,
  reviewer_id   text NOT NULL,
  reviewer_role text NOT NULL CHECK (reviewer_role IN ('faculty_instructor', 'student_peer')),
  scores        jsonb NOT NULL,
  comments      text,
  overall_score double precision NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  created_at    timestamptz NOT NULL,
  updated_at    timestamptz NOT NULL,
  CONSTRAINT reviews_project_reviewer_key UNIQUE (project_id, reviewer_id),
  CONSTRAINT reviews_binding_fkey FOREIGN KEY (project_id, rubric_id)
    REFERENCES project_rubric_bindings (project_id, rubric_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS reviews_project_idx ON reviews (project_id);
`;

const UNIQUE_VIOLATION = '23505';

interface PgError {
  code?: string;
  constraint?: string;
}
const pgErr = (e: unknown): PgError => (typeof e === 'object' && e !== null ? (e as PgError) : {});

interface RubricRow {
  id: string;
  name: string;
  description: string | null;
  scope_type: ScopeType;
  scope_id: string;
  sections: RubricSection[];
  created_at: Date;
  updated_at: Date;
}

interface ReviewRow {
  id: string;
  project_id: string;
  rubric_id: string;
  reviewer_id: string;
  reviewer_role: ReviewerRole;
  scores: Review['scores'];
  comments: string | null;
  overall_score: number;
  created_at: Date;
  updated_at: Date;
}

const toRubric = (r: RubricRow): Rubric => ({
  id: r.id,
  name: r.name,
  description: r.description,
  scope: { type: r.scope_type, id: r.scope_id },
  sections: r.sections,
  created_at: r.created_at.toISOString(),
  updated_at: r.updated_at.toISOString(),
});

const toReview = (r: ReviewRow): Review => ({
  id: r.id,
  project_id: r.project_id,
  rubric_id: r.rubric_id,
  reviewer_id: r.reviewer_id,
  reviewer_role: r.reviewer_role,
  scores: r.scores,
  comments: r.comments,
  overall_score: Number(r.overall_score),
  created_at: r.created_at.toISOString(),
  updated_at: r.updated_at.toISOString(),
});

export class PgStore implements EvaluationStore {
  constructor(private readonly pool: Pool) {}

  static fromUrl(connectionString: string): PgStore {
    return new PgStore(new Pool({ connectionString, max: 10 }));
  }

  /** Creates the tables if they do not exist. Called once at startup. */
  async init(): Promise<void> {
    await this.pool.query(SCHEMA_SQL);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private async bindProjects(c: PoolClient, rubricId: string, projectIds: string[]): Promise<void> {
    if (projectIds.length === 0) return;
    const taken = await c.query<{ project_id: string }>(
      'SELECT project_id FROM project_rubric_bindings WHERE project_id = ANY($1::text[]) ORDER BY project_id',
      [projectIds],
    );
    if (taken.rows.length > 0) throw new ProjectAlreadyBoundError(taken.rows.map((r) => r.project_id));
    try {
      await c.query(
        'INSERT INTO project_rubric_bindings (project_id, rubric_id) SELECT unnest($1::text[]), $2',
        [projectIds, rubricId],
      );
    } catch (e) {
      // A concurrent request bound one of these projects between the check and the insert.
      if (pgErr(e).code === UNIQUE_VIOLATION) throw new ProjectAlreadyBoundError(projectIds);
      throw e;
    }
  }

  async createRubric(rubric: Rubric, projectIds: string[]): Promise<void> {
    await this.tx(async (c) => {
      await c.query(
        `INSERT INTO rubrics (id, name, description, scope_type, scope_id, sections, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          rubric.id,
          rubric.name,
          rubric.description,
          rubric.scope.type,
          rubric.scope.id,
          JSON.stringify(rubric.sections),
          rubric.created_at,
          rubric.updated_at,
        ],
      );
      await this.bindProjects(c, rubric.id, projectIds);
    });
  }

  async getRubric(id: string): Promise<Rubric | null> {
    const res = await this.pool.query<RubricRow>('SELECT * FROM rubrics WHERE id = $1', [id]);
    return res.rows[0] ? toRubric(res.rows[0]) : null;
  }

  async listRubrics(filter: RubricFilter): Promise<Rubric[]> {
    const res = await this.pool.query<RubricRow>(
      `SELECT * FROM rubrics
       WHERE ($1::text IS NULL OR scope_type = $1) AND ($2::text IS NULL OR scope_id = $2)
       ORDER BY created_at, id`,
      [filter.scopeType ?? null, filter.scopeId ?? null],
    );
    return res.rows.map(toRubric);
  }

  private async lockAndCheckUnused(c: PoolClient, id: string): Promise<GuardedResult> {
    const found = await c.query('SELECT id FROM rubrics WHERE id = $1 FOR UPDATE', [id]);
    if (found.rowCount === 0) return 'not_found';
    const bound = await c.query('SELECT 1 FROM project_rubric_bindings WHERE rubric_id = $1 LIMIT 1', [id]);
    return (bound.rowCount ?? 0) > 0 ? 'in_use' : 'ok';
  }

  async updateRubricIfUnused(rubric: Rubric, projectIds: string[]): Promise<GuardedResult> {
    return this.tx(async (c) => {
      const state = await this.lockAndCheckUnused(c, rubric.id);
      if (state !== 'ok') return state;
      await c.query(
        `UPDATE rubrics SET name = $2, description = $3, scope_type = $4, scope_id = $5,
           sections = $6::jsonb, updated_at = $7
         WHERE id = $1`,
        [
          rubric.id,
          rubric.name,
          rubric.description,
          rubric.scope.type,
          rubric.scope.id,
          JSON.stringify(rubric.sections),
          rubric.updated_at,
        ],
      );
      await this.bindProjects(c, rubric.id, projectIds);
      return 'ok';
    });
  }

  async deleteRubricIfUnused(id: string): Promise<GuardedResult> {
    return this.tx(async (c) => {
      const state = await this.lockAndCheckUnused(c, id);
      if (state !== 'ok') return state;
      await c.query('DELETE FROM rubrics WHERE id = $1', [id]);
      return 'ok';
    });
  }

  async listBoundProjectIds(rubricId: string): Promise<string[]> {
    const res = await this.pool.query<{ project_id: string }>(
      'SELECT project_id FROM project_rubric_bindings WHERE rubric_id = $1 ORDER BY project_id',
      [rubricId],
    );
    return res.rows.map((r) => r.project_id);
  }

  async getBoundRubricId(projectId: string): Promise<string | null> {
    const res = await this.pool.query<{ rubric_id: string }>(
      'SELECT rubric_id FROM project_rubric_bindings WHERE project_id = $1',
      [projectId],
    );
    return res.rows[0]?.rubric_id ?? null;
  }

  async createReview(review: Review): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO reviews (id, project_id, rubric_id, reviewer_id, reviewer_role, scores, comments,
           overall_score, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)`,
        [
          review.id,
          review.project_id,
          review.rubric_id,
          review.reviewer_id,
          review.reviewer_role,
          JSON.stringify(review.scores),
          review.comments,
          review.overall_score,
          review.created_at,
          review.updated_at,
        ],
      );
    } catch (e) {
      const err = pgErr(e);
      if (err.code === UNIQUE_VIOLATION && err.constraint === 'reviews_project_reviewer_key') {
        throw new DuplicateReviewError();
      }
      throw e;
    }
  }

  async getReview(projectId: string, reviewId: string): Promise<Review | null> {
    const res = await this.pool.query<ReviewRow>('SELECT * FROM reviews WHERE id = $1 AND project_id = $2', [
      reviewId,
      projectId,
    ]);
    return res.rows[0] ? toReview(res.rows[0]) : null;
  }

  async listReviews(projectIds: string[]): Promise<Review[]> {
    if (projectIds.length === 0) return [];
    const res = await this.pool.query<ReviewRow>(
      'SELECT * FROM reviews WHERE project_id = ANY($1::text[]) ORDER BY created_at, id',
      [projectIds],
    );
    return res.rows.map(toReview);
  }

  async updateReview(review: Review): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE reviews SET scores = $3::jsonb, comments = $4, overall_score = $5, updated_at = $6
       WHERE id = $1 AND project_id = $2`,
      [
        review.id,
        review.project_id,
        JSON.stringify(review.scores),
        review.comments,
        review.overall_score,
        review.updated_at,
      ],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async deleteReview(projectId: string, reviewId: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM reviews WHERE id = $1 AND project_id = $2', [reviewId, projectId]);
    return (res.rowCount ?? 0) > 0;
  }
}
