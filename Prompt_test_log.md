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
**Agent output (paste):** `<...>`
**Verification:** `<did it correctly report only /health and rubrics GET endpoints?>`

## Test 2 - Small generation task
**Prompt**
```
Add GET /api/v1/works and GET /api/v1/works/:workId to src/app.ts, backed by a new src/data/works.ts that contains the two mock works from spec.md section 9. Follow the file-header convention in the existing files. Add Vitest tests. Run typecheck, tests, and build and report the results.
```
**Files created/changed:** `<git diff --stat>`
**Generated code (key excerpts):** `<paste>`
**Verification:** `npm run typecheck && npm test && npm run build` -> `<result>`
**Human modifications:** `<what you changed, and the AI-weight you put in headers>`

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
