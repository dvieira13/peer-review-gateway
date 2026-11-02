# Peer Review & Evaluation Gateway (Domain 3) - CS763

Node.js 24 / TypeScript / Express 5 / PostgreSQL. See `spec.md`.

```bash
npm ci && npm test && npm run build
docker compose up --build        # app on :3000, db on internal network
curl localhost:3000/health
```

## Assignment 1 checklist
- [ ] spec.md, Agent_environment.md, Prompt_test_log.md filled in (AI Usage Log on page 1 of each)
- [ ] Replace `<fill in>` in source headers with real tool and AI weight
- [ ] Add repo secrets `SONAR_TOKEN` (+ `SONAR_HOST_URL` if self-hosted) and edit `sonar-project.properties`
- [ ] Push to `main`; confirm all jobs green; save run log to `docs/pipeline-logs/`
- [ ] `git tag assignment-1 && git push origin assignment-1`, create GitHub Release
- [ ] Submit release URL on Blackboard

## Working from two machines (Mac + Windows)
- Start of session: `git pull` then `npm ci` (only needed if package-lock.json changed).
- End of session: copy Claude Code transcripts into `ai-history/` as `YYYY-MM-DD-<mac|win>-<topic>.jsonl`, commit, `git push`.
- Never work on both machines at once without pushing/pulling in between.
- Node 24 on both (`.nvmrc`). Line endings are forced to LF by `.gitattributes`.
- Log which machine produced which output in `Agent_environment.md` and `code_AI_history.md` (add a "Machine" column).
