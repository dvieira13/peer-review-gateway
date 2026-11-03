# Agent_environment.md - Autonomous Developer Agent Configuration

## AI Usage Log (required on first page)
- **Conceptual AI contribution:** [80]% AI / [20]% human. AI wrote the structure and wording; I collected and verified the real values from my machine and my session transcripts, and found the version and permission-mode corrections.
- **Tool(s):** Claude (claude.ai chat), Claude Sonnet 5.5. The agent being documented is Claude Code 2.1.317 (claude-opus-5-5).
- **Chat link:** https://claude.ai/share/5cf09fd2-4fdb-4649-999a-a7676f35bd22
- **Design-aid prompts used:** my setup and follow-up messages in the linked chat, including the Phase 4 configuration steps and my later checks of /status, permission mode, MCP servers and transcript facts.

## 1. Agent
| Item | Value |
|---|---|
| Tool | Claude Code |
| Version | 2.1.317 for Test 1 and Test 2, verified from the `version` field in the saved transcripts. An earlier setup session (permission and model checks, before the tests) ran on 2.1.316. The tool auto-updates. |
| Install method | Native installer (`curl -fsSL https://claude.ai/install.sh \| bash`) |
| Interface | Interactive terminal CLI in the VS Code integrated terminal; VS Code extension connected (extension 2.1.316 when checked with `/status` before the tests) |

## 2. Operational mode
| Item | Value |
|---|---|
| Permission mode | `default` (approve actions interactively; allow and deny rules from `.claude/settings.json`). Test 1 and Test 2 ran in `default` for all file writes and commands. A switch to `auto` is recorded at the very end of the Test 2 session, after the last tool call. The later AI-log backfill session (documentation edits only, not part of the code experiment) recorded both modes: 6 `default` records and 8 `auto` records. Verified from the `permissionMode` fields in the transcripts in `ai-history/`. The reason for the switch is unknown; I don't recall changing it manually. |
| Interactive vs headless | Interactive session (`claude`) |
| Allowed tools | Read, Edit, Write, Bash(npm run typecheck), Bash(npm test), Bash(npm run build), Bash(git status), Bash(git diff:*), Bash(git log:*) |
| Denied actions | Bash(git commit:*), Bash(git push:*), Bash(rm -rf:*), Bash(sudo:*), Bash(curl:*), Read(./.env) |
| Auto-commit behaviour | None. Commits are made manually with `AI AGENT BUILD:` or `HUMAN MOD:` labels. |
| MCP servers | Connected in the environment: Claude Docs, Figma, and built-ins claude-artifacts and easel; computer-use is off. Tools actually called in Tests 1 and 2 (from the transcripts): Read, Bash, Write, Edit only. No MCP tool was used. |
| Setting sources | User settings and shared project settings (`.claude/settings.json`) |
| Project instructions file | `CLAUDE.md` (committed; contents in Appendix A) |

## 3. Model and parameters
| Item | Value |
|---|---|
| Model (exact ID) | `claude-opus-5-5`, pinned in `.claude/settings.json`. All 32 model records in the Test 1 and Test 2 transcripts show this ID. |
| Reasoning / effort setting | Default (not changed) |
| Temperature, top_p, top_k | Not user-configurable in Claude Code; provider defaults |
| Max output tokens / context | Defaults (no overrides set) |
| Auth | Claude Pro subscription login (no API key) |

## 4. Host environment
| Item | Value |
|---|---|
| Machine | MacBook Pro (Intel, x86_64), macOS 15.7.7 (build 24G720) |
| Node / npm | v24.7.0 / 11.5.1 |
| Docker / Compose | 29.9.2 / v5.6.1 |
| Git | 2.50.1 (Apple Git-155) |
| GitHub CLI | 2.103.3 |
| Editor | Visual Studio Code |
| Second machine | A Windows laptop will be added here when set up. All agent runs so far in this assignment were on the Mac. |

## 5. Repository and pipeline context
- Repo: https://github.com/dvieira13/peer-review-gateway
- Workflow: `.github/workflows/devsecops.yml` (Trivy, Semgrep, SonarQube)
- Logging convention: source headers carry the AI Contribution Weight; commits are `AI AGENT BUILD: ...` or `HUMAN MOD: ...`; interactions are logged in `code_AI_history.md`; session transcripts are in `ai-history/` (email, name, and home path redacted).

## Appendix A - CLAUDE.md contents
```
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
```
