# Project: Peer Review & Evaluation Gateway (CS763 Domain 3)

Single-tenant REST service. Node 24, TypeScript (strict), Express 5, PostgreSQL 17, Vitest + Supertest. The functional spec is `spec.md` - treat it as the source of truth.

## Commands
- Typecheck: `npm run typecheck`
- Test: `npm test`
- Build: `npm run build`
- Run locally: `docker compose up --build`

## Rules
- Every source file starts with a header comment: `AI Contribution Weight: [NN%] AI Generated / [NN%] Human Refactored`, plus file purpose and AI tool.
- Do NOT run `git commit` or `git push`. The human commits manually with labels `AI AGENT BUILD: <feature>` or `HUMAN MOD: <feature>`.
- Do not modify `.github/workflows/devsecops.yml`. Security scanners must stay non-blocking.
- No cross-service calls. External data (users, works) comes only from static mock files in `src/data/`.
- Never put secrets, tokens, or real credentials in code, config, or logs.
- After code changes, run typecheck, tests, and build, and report the results.
- Keep changes minimal and scoped to what was asked; list every file you created or changed.
