# Project: Peer Review & Evaluation Gateway (CS763 Domain 3) - Assignment 2

Single-tenant REST service. Node 24, TypeScript, Express 5, PostgreSQL 17, Vitest + Supertest.
The only source of requirements is `assignment-2/master-spec.md`. All new code goes in `assignment-2/functional-codebase/`, which already contains the package, TypeScript, Vitest and Docker configuration.

## Commands (run from the repository root)
- Typecheck: `npm --prefix assignment-2/functional-codebase run typecheck`
- Test: `npm --prefix assignment-2/functional-codebase test`
- Build: `npm --prefix assignment-2/functional-codebase run build`
- Run locally: `docker compose -f assignment-2/functional-codebase/docker-compose.yml up --build`

## Rules
- Every source and test file starts with a header comment with these fields: Tool, Prompt Summary, AI Contribution (percent), Human Modifications, Verification, Confidence.
- Do NOT run `git commit` or `git push`. The human commits manually.
- Do not modify `.github/workflows/devsecops.yml`.
- No cross-service calls. External data (users, projects, courses, labs) comes only from static mock files.
- The app must also expose `GET /health` returning HTTP 200 with a small JSON body, because the Docker health check calls it.
- After code changes, run typecheck, tests, and build, and report the results.
- Keep changes scoped to what was asked; list every file you created or changed.
