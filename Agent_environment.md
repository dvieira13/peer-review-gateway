# Agent_environment.md - Autonomous Developer Agent Configuration

## AI Usage Log (required on first page)
- **Conceptual AI contribution:** [__]% AI / [__]% human
- **Tool(s) / chat link / prompts:** <fill in>

> Fill every `<...>` from your real machine. Commands to collect each value are shown in the right-hand column.

## 1. Agent
| Item | Value | How to collect |
|---|---|---|
| Tool | Claude Code | - |
| Version | `<x.y.z>` | `claude --version` |
| Install method | `<npm / native installer / desktop>` | - |
| Interface | `<terminal CLI / VS Code / desktop>` | - |

## 2. Operational mode
| Item | Value |
|---|---|
| Permission mode | `<default / acceptEdits / plan / bypass>` and why |
| Interactive vs headless | `<interactive session / claude -p>` |
| Allowed tools | `<Read, Edit, Bash(npm:*), Bash(git:*) ...>` (copy from `.claude/settings.json` or `/permissions`) |
| Denied actions | `<e.g. Bash(rm -rf:*), network tools>` |
| Auto-commit behaviour | `<off - commits made manually with AI AGENT BUILD / HUMAN MOD labels>` |
| MCP servers / hooks / sub-agents | `<none or list>` |
| Project instructions file | `CLAUDE.md` (commit a copy in the repo; paste contents in appendix A) |

## 3. Model and parameters
| Item | Value | Note |
|---|---|---|
| Model (exact ID) | `<e.g. what /model shows>` | Record the exact ID, not just "Claude" |
| Reasoning / effort setting | `<default / extended thinking level>` | |
| Temperature, top_p, top_k | Not user-configurable in Claude Code (provider defaults) | State this explicitly; if you used the API directly, give real values |
| Max output tokens / context | `<defaults or env overrides>` | `env | grep -i anthropic` (redact keys!) |
| Auth | `<subscription login / API key>` | never paste the key |

## 4. Host environment
| Item | Value | How to collect |
|---|---|---|
| OS / arch | `<>` | `uname -a` |
| Node / npm | `<>` | `node -v && npm -v` |
| Docker / Compose | `<>` | `docker --version && docker compose version` |
| Git | `<>` | `git --version` |
| Editor | `<>` | |

## 5. Repository & pipeline context
- Repo: `<https://github.com/you/peer-review-gateway>`
- Workflow: `.github/workflows/devsecops.yml` (Trivy, Semgrep, SonarQube)
- Logging convention: source headers carry the AI Contribution Weight; commits are `AI AGENT BUILD: ...` or `HUMAN MOD: ...`; interactions are logged in `code_AI_history.md`.

## Appendix A - CLAUDE.md contents
```
<paste>
```
