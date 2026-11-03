# Prompt_test_log.md - Initial Prompts & Generated Code

## AI Usage Log (required on first page)
- **Conceptual AI contribution:** [__]% AI / [__]% human
- **Tool(s) / chat link / prompts:** <fill in>

Purpose: show the autonomous agent works in this environment. Run each prompt in Claude Code from the repo root, then paste the *actual* prompt, the agent's summary, the files it touched, and your verification result.

## Test 1 - Environment sanity check
**Prompt**
```
Read spec.md and package.json. Summarize the service in 5 bullet points and list which endpoints from section 6 already exist in src/. Do not modify any files.
```
**Agent output (complete, extracted from the session transcript `ai-history/2026-11-02-mac-test1.jsonl`):**

```text
## Service summary
- **What it is:** A single-tenant REST service in the CS763 Project Portal. Instructors, faculty and student peers use it to score published works against weighted rubrics.
- **Stack:** Node 24, TypeScript 5.9 (strict), Express 5, PostgreSQL 17, Vitest + Supertest, Docker / docker-compose, and GitHub Actions with Trivy, Semgrep and SonarQube.
- **Main data:** Rubrics have criteria whose weights must total 100. Reviewers are assigned to works (one assignment per work and reviewer). Each assignment produces one evaluation, which holds one score per criterion. Users and works are static mock data in `src/data/`, and identity comes from the `X-Mock-User-Id` header.
- **Key rules:** A rubric can't be deleted once an assignment uses it (409). Reviewers can't review their own work (422). Scores must be between 0 and `maxScore`. Submitting requires every criterion to be scored, and submitted evaluations can't be changed.
- **Aggregation:** `GET /works/{id}/summary` uses only submitted evaluations. It reports a weighted percent per role and an overall score that weights instructor 0.5, faculty 0.3 and student 0.2, adjusted to cover only the roles that have evaluations. It also gives the mean and population standard deviation per criterion, rounded to 1 decimal.

## Section 6 endpoints already in `src/`
All routes are defined in `src/app.ts`:

| # | Endpoint | Status |
|---|---|---|
| 1 | `GET /health` | Exists (`src/app.ts:13`), but at `/health`, not `/api/v1/health` |
| 4 | `GET /rubrics` | Partly exists (`src/app.ts:17`): returns mock rubrics but has no `page`/`pageSize` pagination |
| 5 | `GET /rubrics/{rubricId}` | Exists (`src/app.ts:21`), returns 404 `NOT_FOUND` in the spec's error format |

The other 19 endpoints (#2, #3, #6–#22) are not implemented yet.

## Gaps between `package.json` and the spec
- There is no Postgres driver (such as `pg`) in the dependencies, so the service only serves in-memory mock data so far.
- `engines.node` is `>=22` and `@types/node` is version 22, but the spec says Node 24.
- The spec doesn't settle where the health check lives. Section 6 puts every endpoint under `/api/v1`, while section 8 says "health check at `/health`". The current code follows section 8.

I didn't modify any files.
```
**Verification:** I compared the answer with `src/app.ts` and `spec.md`. It listed exactly the three endpoints that exist (`GET /health`, `GET /api/v1/rubrics`, `GET /api/v1/rubrics/:rubricId`) and correctly counted the other 19 as not implemented. It also flagged three real inconsistencies: Node version mismatch (`engines`/`@types/node` vs the spec), the `/health` path ambiguity in the spec, and no Postgres driver yet. I fixed the first two by hand (commit `369adfa`). The transcript shows only Read and read-only Bash calls (find, grep) and `git status` was clean afterwards, so no files were modified.

## Test 2 - Small generation task
**Prompt**
```
Add GET /api/v1/works and GET /api/v1/works/:workId to src/app.ts, backed by a new src/data/works.ts that contains the two mock works from spec.md section 9. Follow the file-header convention in the existing files. Add Vitest tests. Run typecheck, tests, and build and report the results.
```
**Files created/changed:** (`git show --stat 2aee3eb`)

```text
src/app.ts         | 14 ++++++++++++++
 src/data/works.ts  | 29 +++++++++++++++++++++++++++++
 test/works.test.ts | 37 +++++++++++++++++++++++++++++++++++++
 3 files changed, 80 insertions(+)
```
**Generated code (key excerpts):** route changes from commit `2aee3eb` (`git show 2aee3eb -- src/app.ts`). The new files `src/data/works.ts` and `test/works.test.ts` are in the same commit.

```diff
diff --git a/src/app.ts b/src/app.ts
index dae11d2..275cbb3 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -5,6 +5,7 @@
  */
 import express, { Request, Response } from 'express';
 import { rubrics } from './data/mock';
+import { works } from './data/works';
 
 export function createApp(): express.Express {
   const app = express();
@@ -27,5 +28,18 @@ export function createApp(): express.Express {
     res.json(rubric);
   });
 
+  app.get('/api/v1/works', (_req: Request, res: Response) => {
+    res.json({ data: works, total: works.length });
+  });
+
+  app.get('/api/v1/works/:workId', (req: Request, res: Response) => {
+    const work = works.find((w) => w.id === req.params.workId);
+    if (!work) {
+      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Work not found' } });
+      return;
+    }
+    res.json(work);
+  });
+
   return app;
 }
```
**Verification:** `npm run typecheck && npm test && npm run build` -> all three pass; 7 tests passing (4 existing + 3 new). I ran these myself after reviewing the diff.
**Human modifications:** none to the generated code. It was committed unmodified as `2aee3eb` (AI AGENT BUILD). The agent's headers already stated 100% AI / 0% human, which I kept. My part was reviewing the diff against spec section 9. A later comment-only change to the `src/app.ts` header (commit `40931fc`) added the tool attribution.

## Test 3 - Pipeline failure repair (optional but strong evidence)
**Prompt**
```
The GitHub Actions run <url> failed at step <name> with this log: <paste>. Diagnose and propose the minimal fix. Do not change scanner steps to blocking.
```
**Outcome:** `<...>`

## Commit trail
| Commit | Label | Notes |
|---|---|---|
| `d1ec33b` | HUMAN MOD: Import Assignment 1 scaffold (AI-drafted in claude.ai chat) | |
| `5af8e6d` | HUMAN MOD: Pin model and document agent environment | |
| `369adfa` | HUMAN MOD: Align Node 24 types/engines, clarify /health in spec, regenerate lockfile | |
| `2aee3eb` | AI AGENT BUILD: Works endpoints (GET /works, GET /works/:id) | |
| `40931fc` | HUMAN MOD: Correct source headers (100% AI from claude.ai chat) and add tool lines | |
