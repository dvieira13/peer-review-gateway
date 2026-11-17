# MASTER CONCEPTUAL JOURNAL & AI TELEMETRY LOG

* **Student Name:** Dylan Vieira  
* **Assigned Domain Module:** Domain 3: Peer Review & Evaluation Gateway  
* **Core Technology Stack:** Node.js 24 / TypeScript / Express 5 / PostgreSQL 17 (Docker Compose)

\================================================================================

## SECTION 1: SYSTEM ENVIRONMENT & TOOL SPECIFICATION

\================================================================================

### 1.1 AI Tool & Engine Deployments

*Identify all autonomous developer agents, conversational LLMs, inline assistants, or documentation tools utilized during this project milestone.*

| Tool Context | Framework / Platform Name & Version | Underlying LLM Brain Model String | Operational Setting / Access Mode |
| :---- | :---- | :---- | :---- |
| **Code Generation** | Claude Code v2.1.325 | `claude-opus-5-5` | Local CLI, Windows, permission-gated |
| **Document/Design** | Claude chat (claude.ai web interface) | `claude-sonnet-5-5` (Claude Sonnet 5.5) | Web browser, cloud |

Trivy, Semgrep and SonarQube Cloud are non-AI scanners, so they are not listed above. Their findings are triaged in `assignment-2/sast-triage-report.md`.

### 1.2 Verification Telemetry Access Checklist

- [x] Primary Auto-Extracted Session Logs / Appendices Saved to `/.ai_logs/` directory (five redacted Claude Code transcripts in `assignment-2/.ai_logs/`: the build session `00732548` and four short connectivity tests)  
- [x] External Chat Cloud Share Link 1 (If applicable): https://claude.ai/share/5cf09fd2-4fdb-4649-999a-a7676f35bd22  
- [ ] External Chat Cloud Share Link 2 (If applicable): Not applicable (one chat was used)

\================================================================================

## SECTION 2: COGNITIVE REFLECTION — CODE GENERATION & COMPREHENSION

\================================================================================

### 2.1 The Architectural Flow (How You Understand the Code)

*Provide a rigorous, detailed architectural breakdown explaining the data path your AI tool generated for your core routes (e.g., /api/v1/assets/pools/allocate). Describe how an incoming HTTP request payload is captured by your framework, parsed by your middleware, processed via database queries, and safely closed or rolled back inside your transaction engine. State what design patterns (Repository, MVC, Singleton, etc.) the AI decided to adopt.*

I will use the main write route, POST /api/v1/evaluations/projects/:project_id/reviews, as an example. First, a request goes through app.ts to Express, where the body is read to ensure it is under 100kb. Then the router in /api/v1/evaluations/projects sends the request to projects.ts for handling and validation. It checks that the project exists in the mock data, a rubric is bound to the project and aligns with the received rubric_id, the received reveiwer_id is associated with a real mock user, a project is not being reviewed by a student peer that belongs to it, and/or that the scores contain a value for all rubric criteria. Then the handler in projects.ts generates a UUID and a timestamp, calculates the overall_score, and calls store.createReview to insert a new review in the database. The database itself blocks things like duplicate reviews, a review pointing at the wrong rubric, and/or scores outside 0 to 100. Saving a review is a single statement, so it doesn't need a transaction. The code uses a tx() helper function to consolidate the database's create, update, and delete actions for a rubric. The helper begins and executes a transaction, saving it with COMMIT. In the case that something fails in that process, the helper reverts the changes with ROLLBACK. Either way, the helper always releases the database connection afterward.
The design patterns the AI decided to adopt are a repository by way of an EvaluationStore with a real PgStore and a MemoryStore for testing only, a presenter that hides the reviewer_id from student peer reviews, and a central error handler.

### 2.2 Defensive Edge-Case Evaluation (Line-by-Line Code Review)

*Perform a line-by-line human audit of the generated source code. Identify where the AI tool completely failed to account for edge cases, unusual boundaries, or unexpected system properties prior to running your pipeline scanners. (e.g., What happens if an integer balance value scales to a negative integer? How does the routing loop handle an invalid JSON payload sequence?)*

First, here is what the AI handled well:
1. Added error handling for JSON - 400 for Invalid and 413 for oversized body
2. Added handling to reject negative or out of bounds score assignments
3. Added validation to check that weights and max_points are > 0
4. Added database handling to reject duplicate reviews or out of bounds scores

Now for the AI oversight:
1. No upper limit for rubric weights (from check 8f)
  - In this test, the API accepted a rubric with two weights of 1e308. With 5 points for each criteria, the review was accepted and saved with an overall_score of 0 where it should have been 50. With 10 points for each criteria, the score was uncomputable and the database rejected it.
2. The error log revealed a student peer identity (from check 8g)
  - When the database rejected a review, it wrote the failed row to the log which included the student's id stu_004 and role student_peer.
3. Error responses revealed the users who reviewed and belonged to a project (from check 8d)
  - When I submitted a second review claiming to be stu_003, the 409 confirmed that stu_003 had already reviewed the project. When I claimed to be stu_001, the 422 confirmed that stu_001 is a member of the project. By trying different ids, a caller could find out which students reviewed the project and which students belong to it.


### 2.3 The AI Agent's "Security Sins" (Evaluating Code Deficiencies)

*Reflect on the prompt sequence fed to your generation tool. Evaluate why it naturally generated insecure code under your happy-path functional prompt constraints. Detail what security shortcuts the model attempted to take to make the feature execute quickly, and analyze how easily it fell into standard vulnerability traps like BOLA/IDOR, Race Conditions, or input injection.*

My prompts to ClaudeCode to build the app were aiming for happy-path functionality. In the first prompt I told it to refer to the master-spec.md file as the source of truth for the end goal in my assignment-2 folder, and then in my second prompt I referred it to the list of all of the endpoints in master-spec.md, with the mock data and tests to write, and confirmed my tech stack. My spec decision 5, which came from a list of decisions I made according to my Claude chat's reccomendations and added to the master-spec.md, said the reviewer’s id and role come in the request body, and ClaudeCode built it without objecting or adding a caller check. As a result, there are no endpoints that authenticate users. It also fell into a BOLA/IDOR trap in that the review PUT and DELETE routes were only designed to check that the review exists, but not who is asking, which allows anyone with a review’s id to change or delete it. Also as mentioned in section 2.2, another security shortcut was that it chose to log entire error objects without redacting sensitive user information.
With all of that said, it did a surpsingly good job in many regards. Semgrep reported no issues, and SonarQube reported only 2.

\================================================================================

## SECTION 3: COGNITIVE REFLECTION — DOCUMENT AUTHORING & THREAT DESIGN

\================================================================================

### 3.1 AI Collaboration Matrix for Security Analysis

*Detail exactly how you collaborated with your chosen AI tools to construct your written security requirements, abuse cases, attack trees, and threat modeling frameworks.*

I used Claude chat for all of the document work and I worked by multi-turn chaining with constraints. I did the manual checks first, all of which the chat proposed, along with a preditction for the checks. I reviewed the proposed checks and then ran them in my own terminal one at a time. Then, I used the four vulnerabilities I validated, along with the 10 check outputs, to write the triage report. Once that was completed, I began the security analysis, at which point the abuse cases, attack trees and threat model could be built from evidence I had collected, and each statement is tagged verified, inferred, or hypothesis. To start the analysis, I had the chat propose options for the abuse cases, attack trees, attack surface mapping, etc that I could review and pick from for the report. Once it drafted a report for me, I reviewed it and found places to trim back bloated inforamtion and also elected to add user and abuser stories for a more robust report.

### 3.2 Evaluation of Automated Conceptual "Blind Spots"

*Analyze the output your document-authoring AI generated. Did the tool hallucinate security threat concepts, overlook critical domain-specific logical risks (like over-allocating hardware inventory pools), or suggest generic text summaries that lacked rigorous engineering context? Detail how you manually audited and revised the AI's structural concepts to match real-world parameters.*


My Claude chat did a shockingly good job overall, especially when it came to exlpanations and summaries with extreme detail and engineering context. In fact, I had to ask it to rework and simplify some things along the way like the security-analysis.md, which it made way too dense at first, or even just general explanations I requested to better understand some concepts during the conversation that were complex and hard to understand at first.
One notable oversight I caught was that it said there was nothing in place to stop a student from reviewing their own project. My manual check 8d tried a request of this nature as stu_001, which returned a 422 and proved the AI wrong. This made Claude rethink and realize that the real issue was that there is no validation checking the reviewer id in the request. It then updated the security-analysis to include that flaw. Outside of that, the only other oversights I noticed were a couple of instances when I asked Claude to confirm that it was making decisions based on context I had given it at the beginning of the conversation, like the project summary and requirements, to which it re-evaluated and changed its answers.

\================================================================================

## SECTION 4: HUMAN VERIFICATION & AUDIT TRAIL LOG

\================================================================================ *Record every manual configuration test, integration check, dynamic execution verification (Postman, cURL loops), or tool scan triage loop handled completely by you by hand.*

| Timestamp | Component Target | Testing/Auditing New Methodology | Verified Outcome / Discovered Defect |
| :---- | :---- | :---- | :---- |
| 2026-11-16 | Every endpoint (V1) | Stated a prediction in chat, then ran curl with no credentials: created a rubric (8a), submitted a faculty review by naming `fac_001` (8b), and submitted peer reviews under four student ids (8i, 8j) | Failed Check: no authentication. Anyone can create rubrics and submit grades as any user (CWE-306, CVSS 9.1) |
| 2026-11-16 | `PUT` and `DELETE` on a review (V2) | Curl with no identity against another reviewer's review (8c, 8e) | Failed Check: `PUT` returned 200 and lowered a faculty grade from 76.67 to 6.67; `DELETE` returned 204 and the review became 404 (CWE-639, CVSS 7.5) |
| 2026-11-16 | `POST` review error responses (V3) | Five probes with different reviewer ids and roles, comparing each response (8d) | Failed Check: the 409 confirmed `stu_003` had reviewed, the 422 confirmed `stu_001` is a member, and the 422s revealed which ids exist and their roles (CWE-204, CVSS 5.3) |
| 2026-11-16 | Rubric weights and error logging (V4) | Created a rubric with two weights of `1e308`, submitted reviews, and read the app log (8f, 8g) | Failed Check: 5 points each gave 201 with a wrong score of 0 (should be 50); 10 points gave a 500 from `NaN`; the log exposed `stu_004` and `student_peer` (CWE-1284, CVSS 5.3) |
| 2026-11-16 | Rubric-in-use rule | `PUT` and `DELETE` on a rubric already bound to a project (8h) | Success: both returned 409, as the spec requires |
| 2026-11-16 | CVSS scores for V1 to V4 | Entered each vector into the FIRST CVSS v3.1 calculator | Success: 9.1, 7.5, 5.3 and 5.3, matching the report |
| 2026-11-16 | `devsecops.yml` | Ran `git diff --stat` before committing the AI's workflow, then counted the `uses:` lines | Failed Check: the first copy was empty (193 deletions, 0 insertions); after re-copying, all 18 `uses:` lines were pinned to 40-character SHAs |
| 2026-11-16 | Docker build and Compose stack | Built the image and ran the stack myself, then re-ran CI | Failed Check: `npm ci` missed Linux optional dependencies, and the container refused to start without `DATABASE_URL`. The agent had not caught either. After the fixes the stack was healthy and CI run #34 passed |
| 2026-11-16 | SonarQube coverage gate | Cross-checked the 79.1% coverage against the raw `lcov` data | Success: `server.ts` was 0 of 16 lines and `pgStore.ts` 0 of 66, which is 82 of the 101 uncovered lines |
| 2026-11-16 | Scanner results | Triaged Semgrep, SonarQube and both Trivy scans by hand | Success: Semgrep 0 findings, Sonar 2 true positives (low impact), Trivy image 20 findings (19 in the bundled npm), and none of V1 to V4 found by any scanner |

&nbsp;
