# Manual Verification Evidence: Naive Baseline (Assignment 2)

## AI Usage Log

- **Tool:** Claude (claude.ai chat, Claude Sonnet 5.5), 2026-11-16
- **Prompt Summary:** The chat proposed each check, stated a prediction before the author ran it, and helped interpret the results. The author ran every command in their own terminal.
- **AI Contribution:** [to be filled in by the author]
- **Human Modifications:** [to be filled in by the author]
- **Verification:** Every output block below is copied verbatim from the author's terminal as pasted into the chat. Nothing was re-run or edited by the AI. Predictions were stated in the chat before each run. For check 8a the prediction was not also saved in a file; it exists only in the chat.
- **Confidence:** [to be filled in by the author]

## Environment

- Service: `assignment-2/functional-codebase`, built and run with `docker compose up -d --build --wait` (app + PostgreSQL 17), reachable at `localhost:3000`.
- Date of runs: 2026-11-16, evening US Eastern (the `created_at` fields below are UTC, so they read 2026-11-17).
- All requests were sent with `curl` with **no credentials of any kind** (no token, cookie or header identifying a user).
- Mock users and projects come from `src/mock/`. `proj_101` has members `stu_001` and `stu_002`; `proj_102` has member `stu_003`.
- Check 8a was run without printing the HTTP status. From 8b onward the commands use `curl -w "\nHTTP %{http_code}\n"`.

## Summary

| Check | What it tests | Predicted | Observed | Matched |
|---|---|---|---|---|
| 8a | Create a rubric with no credentials | Succeeds, rubric bound to `proj_101` | JSON body with rubric id, `bound_project_ids: ["proj_101"]`, `in_use: true` (status not printed) | Yes |
| 8b | Submit a faculty review by claiming `fac_001` | 201, `overall_score` 76.67, `reviewer_id` shown | 201, 76.67, `reviewer_id: "fac_001"` | Yes |
| 8c | Edit someone else's review with no identity | 200, `overall_score` 6.67, summary mean 6.67 | 200, 6.67, summary `mean_score` 6.67 | Yes |
| 8d | Probe peer anonymity through error messages | 201 / 409 / 422 / 422 / 422 / list with no peer id | exactly as predicted | Yes |
| 8e | Delete someone else's review with no identity | 204, then 404, faculty count 0 | 204, 404, `review_count` 0 and 1 | Yes |
| 8f | Weights of `1e308` | Case A: 201 with score 0. Case B: 500 | 201 with `overall_score: 0`; 500 with `NaN` rejected by DB `CHECK` | Yes |
| 8g | Does the error log expose a peer's identity? | 500, log shows `stu_004` | 500, log shows `stu_004, student_peer` | Yes |
| 8h | Is a rubric that a project is bound to locked against update and delete? | 409 on both | 409 on PUT and 409 on DELETE | Yes |
| 8i | Can a project's own member inflate its peer score by claiming a non-member's id? | 201, `overall_score` 100, no `reviewer_id` | 201, 100, no `reviewer_id` | Yes |
| 8j | Can peer reviews be stuffed under several student ids? | Three more 201s; peer block shows 4 reviews, mean 100 | Three 201s; `review_count` 4, `mean_score` 100, faculty block empty | Yes |

---

## 8a. Rubric creation with no credentials

**Prediction (stated in chat before the run):** 201 with a JSON body containing a rubric id, scope `proj_101`, `bound_project_ids ["proj_101"]`, `in_use true`. No login needed, because the code has no authentication.

**Command:**

```
curl -s -X POST localhost:3000/api/v1/evaluations/rubrics -H "Content-Type: application/json" -d '{"name":"R1","project_id":"proj_101","sections":[{"title":"S1","criteria":[{"description":"c1","weight":1,"max_points":10},{"description":"c2","weight":2,"max_points":20}]}]}'
```

**Observed:**

```
{"id":"e418140a-1888-415f-a414-081a934c1ae3","name":"R1","description":null,"scope":{"type":"project","id":"proj_101"},"sections":[{"title":"S1","description":null,"criteria":[{"id":"86675397-4b04-415a-95db-c60002bb8f21","description":"c1","weight":1,"max_points":10},{"id":"36f29507-2611-4db0-92e2-d741b0c61fb5","description":"c2","weight":2,"max_points":20}]}],"bound_project_ids":["proj_101"],"in_use":true,"created_at":"2026-11-17T02:03:39.598Z","updated_at":"2026-11-17T02:03:39.598Z"}
```

---

## 8b. Faculty review submitted by claiming a faculty id

**Prediction (stated in chat before the run):** HTTP 201; `overall_score` 76.67 from `(1 x 8/10 + 2 x 15/20) / 3 x 100`; the response includes `reviewer_id: "fac_001"` and `reviewer_role: "faculty_instructor"`; no authentication of any kind.

**Command:**

```
curl -s -w "\nHTTP %{http_code}\n" -X POST localhost:3000/api/v1/evaluations/projects/proj_101/reviews -H "Content-Type: application/json" -d '{"reviewer_id":"fac_001","reviewer_role":"faculty_instructor","rubric_id":"e418140a-1888-415f-a414-081a934c1ae3","scores":[{"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21","points":8},{"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5","points":15}],"comments":"first review"}'
```

**Observed:**

```
{"id":"1325f5be-ea49-43d4-9334-b7faa0adab96","project_id":"proj_101","rubric_id":"e418140a-1888-415f-a414-081a934c1ae3","reviewer_role":"faculty_instructor","scores":[{"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21","points":8,"feedback":null},{"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5","points":15,"feedback":null}],"comments":"first review","overall_score":76.67,"created_at":"2026-11-17T02:05:05.196Z","updated_at":"2026-11-17T02:05:05.196Z","reviewer_id":"fac_001"}
HTTP 201
```

---

## 8c. Editing someone else's review with no identity

**Prediction (stated in chat before the run):** the PUT returns 200 because the code looks the review up by project and review id only; `overall_score` becomes 6.67 from `(1 x 1/10 + 2 x 1/20) / 3 x 100`; the summary then shows the faculty block with `review_count` 1 and `mean_score` 6.67.

**Commands:**

```
curl -s -w "\nHTTP %{http_code}\n" -X PUT localhost:3000/api/v1/evaluations/projects/proj_101/reviews/1325f5be-ea49-43d4-9334-b7faa0adab96 -H "Content-Type: application/json" -d '{"scores":[{"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21","points":1},{"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5","points":1}],"comments":"edited by someone else"}'
curl -s -w "\nHTTP %{http_code}\n" localhost:3000/api/v1/evaluations/projects/proj_101/summary
```

**Observed:**

```
{"id":"1325f5be-ea49-43d4-9334-b7faa0adab96","project_id":"proj_101","rubric_id":"e418140a-1888-415f-a414-081a934c1ae3","reviewer_role":"faculty_instructor","scores":[{"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21","points":1,"feedback":null},{"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5","points":1,"feedback":null}],"comments":"edited by someone else","overall_score":6.67,"created_at":"2026-11-17T02:05:05.196Z","updated_at":"2026-11-17T02:07:06.330Z","reviewer_id":"fac_001"}
HTTP 200
{"project_id":"proj_101","title":"Threat Modeling Toolkit","course_id":"CS501","section":"A1","lab_id":"lab_cybersec","rubric_id":"e418140a-1888-415f-a414-081a934c1ae3","faculty_instructor":{"reviewer_role":"faculty_instructor","review_count":1,"mean_score":6.67,"std_dev":0,"min_score":6.67,"max_score":6.67,"mean_grade_point":0,"grade_distribution":{"A":0,"B":0,"C":0,"D":0,"F":1},"grade_point_trend":[{"submitted_at":"2026-11-17T02:05:05.196Z","overall_score":6.67,"grade_point":0,"running_mean_grade_point":0}],"criteria":[{"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21","description":"c1","weight":1,"max_points":10,"mean_points":1},{"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5","description":"c2","weight":2,"max_points":20,"mean_points":1}]},"student_peer":{"reviewer_role":"student_peer","review_count":0,"mean_score":null,"std_dev":null,"min_score":null,"max_score":null,"mean_grade_point":null,"grade_distribution":{"A":0,"B":0,"C":0,"D":0,"F":0},"grade_point_trend":[],"criteria":[{"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21","description":"c1","weight":1,"max_points":10,"mean_points":null},{"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5","description":"c2","weight":2,"max_points":20,"mean_points":null}]}}
HTTP 200
```

Note: `updated_at` changed, but nothing in the response or the summary records who made the edit.

---

## 8d. Peer-anonymity probes through error responses

**Predictions (stated in chat before the run, one per command in order):**
1. `stu_003` as a peer: 201, no `reviewer_id` in the response, `overall_score` 50.
2. The same request again: 409 "already submitted", which confirms `stu_003` reviewed `proj_101`.
3. `stu_001` as a peer: 422 stating a student cannot review a project they are a member of (reveals membership).
4. `stu_999`: 422 "Unknown reviewer_id".
5. `stu_004` claiming faculty: 422 role mismatch (with 4, lets a caller learn which ids exist and their roles).
6. The review list: 200, with `reviewer_id` shown for the faculty review and none for the peer review.

**Commands** (`rev` is a shell function that POSTs a review to `proj_101` with the given reviewer id and role):

```
rev() { curl -s -w "\nHTTP %{http_code}\n" -X POST localhost:3000/api/v1/evaluations/projects/proj_101/reviews -H "Content-Type: application/json" -d "{\"reviewer_id\":\"$1\",\"reviewer_role\":\"$2\",\"rubric_id\":\"e418140a-1888-415f-a414-081a934c1ae3\",\"scores\":[{\"criterion_id\":\"86675397-4b04-415a-95db-c60002bb8f21\",\"points\":5},{\"criterion_id\":\"36f29507-2611-4db0-92e2-d741b0c61fb5\",\"points\":10}],\"comments\":\"probe\"}"; }
rev stu_003 student_peer
rev stu_003 student_peer
rev stu_001 student_peer
rev stu_999 student_peer
rev stu_004 faculty_instructor
curl -s -w "\nHTTP %{http_code}\n" localhost:3000/api/v1/evaluations/projects/proj_101/reviews
```

**Observed:**

```
{"id":"fe4b5b6c-de0d-4ff8-ab60-49bbf59e46db","project_id":"proj_101","rubric_id":"e418140a-1888-415f-a414-081a934c1ae3","reviewer_role":"student_peer","scores":[{"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21","points":5,"feedback":null},{"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5","points":10,"feedback":null}],"comments":"probe","overall_score":50,"created_at":"2026-11-17T02:08:07.103Z","updated_at":"2026-11-17T02:08:07.103Z"}
HTTP 201
{"error":{"code":"conflict","message":"This reviewer has already submitted a review for this project"}}
HTTP 409
{"error":{"code":"unprocessable_entity","message":"A student_peer cannot review a project they are a member of"}}
HTTP 422
{"error":{"code":"unprocessable_entity","message":"Unknown reviewer_id: stu_999"}}
HTTP 422
{"error":{"code":"unprocessable_entity","message":"reviewer_role faculty_instructor does not match the reviewer's role"}}
HTTP 422
{"project_id":"proj_101","count":2,"data":[{"id":"1325f5be-ea49-43d4-9334-b7faa0adab96","project_id":"proj_101","rubric_id":"e418140a-1888-415f-a414-081a934c1ae3","reviewer_role":"faculty_instructor","scores":[{"points":1,"feedback":null,"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21"},{"points":1,"feedback":null,"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5"}],"comments":"edited by someone else","overall_score":6.67,"created_at":"2026-11-17T02:05:05.196Z","updated_at":"2026-11-17T02:07:06.330Z","reviewer_id":"fac_001"},{"id":"fe4b5b6c-de0d-4ff8-ab60-49bbf59e46db","project_id":"proj_101","rubric_id":"e418140a-1888-415f-a414-081a934c1ae3","reviewer_role":"student_peer","scores":[{"points":5,"feedback":null,"criterion_id":"86675397-4b04-415a-95db-c60002bb8f21"},{"points":10,"feedback":null,"criterion_id":"36f29507-2611-4db0-92e2-d741b0c61fb5"}],"comments":"probe","overall_score":50,"created_at":"2026-11-17T02:08:07.103Z","updated_at":"2026-11-17T02:08:07.103Z"}]}
HTTP 200
```

Notes:
- The first request in this block was made by the tester, claiming to be `stu_003`. The real `stu_003` would now receive the 409 on their own one allowed review for `proj_101`.
- Checks 3 to 5 stop at the user and role checks, before any score or database step, so they create nothing.

---

## 8e. Deleting someone else's review with no identity

**Prediction (stated in chat before the run):** DELETE returns 204 with no body; a GET of that review afterwards returns 404; the summary shows faculty `review_count` 0 and peer `review_count` 1.

**Commands:**

```
curl -s -w "\nHTTP %{http_code}\n" -X DELETE localhost:3000/api/v1/evaluations/projects/proj_101/reviews/1325f5be-ea49-43d4-9334-b7faa0adab96
curl -s -w "\nHTTP %{http_code}\n" localhost:3000/api/v1/evaluations/projects/proj_101/reviews/1325f5be-ea49-43d4-9334-b7faa0adab96
curl -s localhost:3000/api/v1/evaluations/projects/proj_101/summary | grep -o '"review_count":[0-9]*'
```

**Observed:**

```

HTTP 204
{"error":{"code":"not_found","message":"Review 1325f5be-ea49-43d4-9334-b7faa0adab96 not found for project proj_101"}}
HTTP 404
"review_count":0
"review_count":1
```

---

## 8f. Numeric edge case: very large weights

**Prediction (stated in chat before the run):** `validation.ts` accepts any finite weight above 0, so `1e308` is accepted. For two criteria with weight `1e308` and max 10 points:
- Case A (5 points each, `fac_001`): the weighted sum is `1e308` (finite) but the total weight overflows to `Infinity`, so the result is HTTP 201 with `overall_score: 0`, wrong because the correct score is 50.
- Case B (10 points each, `fac_002`): both sums overflow, giving `Infinity / Infinity = NaN`, which the database `CHECK` on `overall_score` rejects, so HTTP 500 `internal_error` with a trace in the app log.

**Commands** (`R`, `C1`, `C2` are the rubric and criterion ids extracted from the creation response; `rev2` posts a review to `proj_102`):

```
OUT=$(curl -s -X POST localhost:3000/api/v1/evaluations/rubrics -H "Content-Type: application/json" -d '{"name":"Big","project_id":"proj_102","sections":[{"title":"S","criteria":[{"description":"a","weight":1e308,"max_points":10},{"description":"b","weight":1e308,"max_points":10}]}]}')
echo "$OUT"
R=$(echo "$OUT" | grep -o '"id":"[^"]*"' | sed -n 1p | cut -d'"' -f4)
C1=$(echo "$OUT" | grep -o '"id":"[^"]*"' | sed -n 3p | cut -d'"' -f4)
C2=$(echo "$OUT" | grep -o '"id":"[^"]*"' | sed -n 4p | cut -d'"' -f4)
echo "R=$R C1=$C1 C2=$C2"
rev2() { curl -s -w "\nHTTP %{http_code}\n" -X POST localhost:3000/api/v1/evaluations/projects/proj_102/reviews -H "Content-Type: application/json" -d "{\"reviewer_id\":\"$1\",\"reviewer_role\":\"$2\",\"rubric_id\":\"$R\",\"scores\":[{\"criterion_id\":\"$C1\",\"points\":$3},{\"criterion_id\":\"$C2\",\"points\":$3}],\"comments\":\"edge\"}"; }
rev2 fac_001 faculty_instructor 5
rev2 fac_002 faculty_instructor 10
docker compose -f assignment-2/functional-codebase/docker-compose.yml logs app --tail 15
```

**Observed:**

```
{"id":"24d0b4c8-65db-4dee-b981-ece3bf3227e0","name":"Big","description":null,"scope":{"type":"project","id":"proj_102"},"sections":[{"title":"S","description":null,"criteria":[{"id":"e4213cd9-bbbf-43af-9c1a-0852a79ef96c","description":"a","weight":1e+308,"max_points":10},{"id":"c91b7ec7-823e-424c-aaf0-75438a9d8fbb","description":"b","weight":1e+308,"max_points":10}]}],"bound_project_ids":["proj_102"],"in_use":true,"created_at":"2026-11-17T02:11:03.651Z","updated_at":"2026-11-17T02:11:03.651Z"}
R=24d0b4c8-65db-4dee-b981-ece3bf3227e0 C1=e4213cd9-bbbf-43af-9c1a-0852a79ef96c C2=c91b7ec7-823e-424c-aaf0-75438a9d8fbb
{"id":"4324f0ec-f3be-4148-915d-6f0c334a81be","project_id":"proj_102","rubric_id":"24d0b4c8-65db-4dee-b981-ece3bf3227e0","reviewer_role":"faculty_instructor","scores":[{"criterion_id":"e4213cd9-bbbf-43af-9c1a-0852a79ef96c","points":5,"feedback":null},{"criterion_id":"c91b7ec7-823e-424c-aaf0-75438a9d8fbb","points":5,"feedback":null}],"comments":"edge","overall_score":0,"created_at":"2026-11-17T02:11:10.661Z","updated_at":"2026-11-17T02:11:10.661Z","reviewer_id":"fac_001"}
HTTP 201
{"error":{"code":"internal_error","message":"Internal server error"}}
HTTP 500
app-1  |   detail: 'Failing row contains (b1f27d00-a880-49cf-a1db-a49a46462277, proj_102, 24d0b4c8-65db-4dee-b981-ece3bf3227e0, fac_002, faculty_instructor, [{"points": 10, "feedback": null, "criterion_id": "e4213cd9-bbbf..., edge, NaN, 2026-11-17 02:11:11.617+00, 2026-11-17 02:11:11.617+00).',
app-1  |   hint: undefined,
app-1  |   position: undefined,
app-1  |   internalPosition: undefined,
app-1  |   internalQuery: undefined,
app-1  |   where: undefined,
app-1  |   schema: 'public',
app-1  |   table: 'reviews',
app-1  |   column: undefined,
app-1  |   dataType: undefined,
app-1  |   constraint: 'reviews_overall_score_check',
app-1  |   file: 'execMain.c',
app-1  |   line: '2090',
app-1  |   routine: 'ExecConstraints'
app-1  | }
```

Note: Case A was accepted and stored with `overall_score: 0` although the correct value is 50. No error was raised.

---

## 8g. Does the error log expose an anonymous peer's identity?

**Prediction (stated in chat before the run):** the same 500 as Case B, and the `Failing row contains` line in the app log shows `stu_004` and `student_peer`, meaning the identity the API hides from responses is written to the log.

**Commands** (reusing `rev2`, `R`, `C1` and `C2` from 8f):

```
rev2 stu_004 student_peer 10
docker compose -f assignment-2/functional-codebase/docker-compose.yml logs app --tail 20 | grep -i "Failing row"
```

**Observed:**

```
{"error":{"code":"internal_error","message":"Internal server error"}}
HTTP 500
app-1  |   detail: 'Failing row contains (04b206e6-d64b-41d7-aa4e-771b6f339006, proj_102, 24d0b4c8-65db-4dee-b981-ece3bf3227e0, stu_004, student_peer, [{"points": 10, "feedback": null, "criterion_id": "e4213cd9-bbbf..., edge, NaN, 2026-11-17 02:12:05.712+00, 2026-11-17 02:12:05.712+00).',
```

---

## 8h. A rubric bound to a project cannot be modified or deleted

This check was run on a fresh stack (the previous one had been torn down), so the rubric id differs from earlier checks. It confirms a consequence stated in V1 of the triage report: a rubric created with no credentials binds its project and cannot be changed or removed afterwards.

**Prediction (stated in chat before the run):** `R=` prints a rubric id; the PUT returns HTTP 409 with a message that the rubric is in use and cannot be modified; the DELETE returns HTTP 409 with a message that it cannot be deleted.

**Commands:**

```
OUT=$(curl -s -X POST localhost:3000/api/v1/evaluations/rubrics -H "Content-Type: application/json" -d '{"name":"R1","project_id":"proj_101","sections":[{"title":"S1","criteria":[{"description":"c1","weight":1,"max_points":10}]}]}')
R=$(echo "$OUT" | grep -o '"id":"[^"]*"' | sed -n 1p | cut -d'"' -f4)
echo "R=$R"
curl -s -w "\nHTTP %{http_code}\n" -X PUT localhost:3000/api/v1/evaluations/rubrics/$R -H "Content-Type: application/json" -d '{"name":"changed","project_id":"proj_101","sections":[{"title":"S1","criteria":[{"description":"c1","weight":1,"max_points":10}]}]}'
curl -s -w "\nHTTP %{http_code}\n" -X DELETE localhost:3000/api/v1/evaluations/rubrics/$R
```

**Observed** (the Docker build, start-up and teardown output around these commands is omitted):

```
R=43f30557-f3d2-45c6-adae-0af77694b92c
{"error":{"code":"conflict","message":"Rubric is in use by at least one project and cannot be modified"}}
HTTP 409
{"error":{"code":"conflict","message":"Rubric is in use by at least one project and cannot be deleted"}}
HTTP 409
```

---

## 8i and 8j. Peer-review inflation and stuffing under claimed student ids

These two checks support abuse cases AC-4 and AC-10 in `assignment-2/security-analysis.md`. They were run on a fresh stack, so the rubric and review ids differ from earlier checks. The rubric has the same shape as in 8a (two criteria, weights 1 and 2, max points 10 and 20) and is bound to `proj_101`, whose members include `stu_001`. In 8i, a student who is a member of the project wants a high peer score for it, so the request names `stu_004`, who is not a member.

**Predictions (stated in chat before the run):**
- 8i: `stu_004` as a peer with full points returns 201 with `overall_score` 100 and no `reviewer_id` in the response.
- 8j: `stu_003`, `stu_005` and `stu_006` each return 201 (a 422 would mean that student is a member of `proj_101`). The summary then shows the peer block with 4 reviews and a mean of 100, and an empty faculty block.

**Commands** (the stack start and the rubric creation, which printed `R`, `C1` and `C2`, are omitted; `rev3` posts a full-marks peer review to `proj_101` with the given reviewer id):

```
rev3() { curl -s -w "\nHTTP %{http_code}\n" -X POST localhost:3000/api/v1/evaluations/projects/proj_101/reviews -H "Content-Type: application/json" -d "{\"reviewer_id\":\"$1\",\"reviewer_role\":\"student_peer\",\"rubric_id\":\"$R\",\"scores\":[{\"criterion_id\":\"$C1\",\"points\":10},{\"criterion_id\":\"$C2\",\"points\":20}],\"comments\":\"inflate\"}"; }
echo "--- 8i"
rev3 stu_004
echo "--- 8j"
rev3 stu_003
rev3 stu_005
rev3 stu_006
curl -s -w "\nHTTP %{http_code}\n" localhost:3000/api/v1/evaluations/projects/proj_101/summary
```

**Observed:**

```
--- 8i
{"id":"faf581d2-2ce9-4b45-86e0-9a79f129ce0e","project_id":"proj_101","rubric_id":"59b14dad-daa7-45e8-8e8c-51945a925516","reviewer_role":"student_peer","scores":[{"criterion_id":"d365992a-86e6-4280-b068-f1d83aa49ac5","points":10,"feedback":null},{"criterion_id":"b1e3309c-5009-447f-b26c-5003a92ecb82","points":20,"feedback":null}],"comments":"inflate","overall_score":100,"created_at":"2026-11-17T03:34:12.021Z","updated_at":"2026-11-17T03:34:12.021Z"}
HTTP 201
--- 8j
{"id":"273cce20-f671-4458-8263-0dc9e18c1a1b","project_id":"proj_101","rubric_id":"59b14dad-daa7-45e8-8e8c-51945a925516","reviewer_role":"student_peer","scores":[{"criterion_id":"d365992a-86e6-4280-b068-f1d83aa49ac5","points":10,"feedback":null},{"criterion_id":"b1e3309c-5009-447f-b26c-5003a92ecb82","points":20,"feedback":null}],"comments":"inflate","overall_score":100,"created_at":"2026-11-17T03:34:13.527Z","updated_at":"2026-11-17T03:34:13.527Z"}
HTTP 201
{"id":"49c3205c-be44-4c5f-918d-119ce868c6ad","project_id":"proj_101","rubric_id":"59b14dad-daa7-45e8-8e8c-51945a925516","reviewer_role":"student_peer","scores":[{"criterion_id":"d365992a-86e6-4280-b068-f1d83aa49ac5","points":10,"feedback":null},{"criterion_id":"b1e3309c-5009-447f-b26c-5003a92ecb82","points":20,"feedback":null}],"comments":"inflate","overall_score":100,"created_at":"2026-11-17T03:34:14.714Z","updated_at":"2026-11-17T03:34:14.714Z"}
HTTP 201
{"id":"175e19fd-9a47-456c-bf52-0c22ba93d212","project_id":"proj_101","rubric_id":"59b14dad-daa7-45e8-8e8c-51945a925516","reviewer_role":"student_peer","scores":[{"criterion_id":"d365992a-86e6-4280-b068-f1d83aa49ac5","points":10,"feedback":null},{"criterion_id":"b1e3309c-5009-447f-b26c-5003a92ecb82","points":20,"feedback":null}],"comments":"inflate","overall_score":100,"created_at":"2026-11-17T03:34:15.638Z","updated_at":"2026-11-17T03:34:15.638Z"}
HTTP 201
{"project_id":"proj_101","title":"Threat Modeling Toolkit","course_id":"CS501","section":"A1","lab_id":"lab_cybersec","rubric_id":"59b14dad-daa7-45e8-8e8c-51945a925516","faculty_instructor":{"reviewer_role":"faculty_instructor","review_count":0,"mean_score":null,"std_dev":null,"min_score":null,"max_score":null,"mean_grade_point":null,"grade_distribution":{"A":0,"B":0,"C":0,"D":0,"F":0},"grade_point_trend":[],"criteria":[{"criterion_id":"d365992a-86e6-4280-b068-f1d83aa49ac5","description":"c1","weight":1,"max_points":10,"mean_points":null},{"criterion_id":"b1e3309c-5009-447f-b26c-5003a92ecb82","description":"c2","weight":2,"max_points":20,"mean_points":null}]},"student_peer":{"reviewer_role":"student_peer","review_count":4,"mean_score":100,"std_dev":0,"min_score":100,"max_score":100,"mean_grade_point":4,"grade_distribution":{"A":4,"B":0,"C":0,"D":0,"F":0},"grade_point_trend":[{"submitted_at":"2026-11-17T03:34:12.021Z","overall_score":100,"grade_point":4,"running_mean_grade_point":4},{"submitted_at":"2026-11-17T03:34:13.527Z","overall_score":100,"grade_point":4,"running_mean_grade_point":4},{"submitted_at":"2026-11-17T03:34:14.714Z","overall_score":100,"grade_point":4,"running_mean_grade_point":4},{"submitted_at":"2026-11-17T03:34:15.638Z","overall_score":100,"grade_point":4,"running_mean_grade_point":4}],"criteria":[{"criterion_id":"d365992a-86e6-4280-b068-f1d83aa49ac5","description":"c1","weight":1,"max_points":10,"mean_points":10},{"criterion_id":"b1e3309c-5009-447f-b26c-5003a92ecb82","description":"c2","weight":2,"max_points":20,"mean_points":20}]}}
HTTP 200
```

Notes:
- No credentials of any kind were sent. The server cannot tell that the 8i request came from a member of `proj_101`, because the only identity it sees is the one typed in the body.
- In 8j, the peer block of the summary includes a `submitted_at` timestamp for each peer review in `grade_point_trend`, visible to any caller. This is recorded as an observation (threat T-14 in `security-analysis.md`), not as a validated vulnerability.

---

## What these checks show

| Finding | Checks | Scanner detected it? |
|---|---|---|
| V1: no authentication; identity is whatever the request body claims | 8a, 8b, 8h, 8i, 8j | No (Semgrep 0 findings; SonarQube 0 vulnerabilities and 0 security hotspots) |
| V2: no ownership check on review update and delete | 8c, 8e | No |
| V3: peer anonymity broken through error responses | 8d | No |
| V4: unbounded weights lead to wrong grades, 500 errors and an anonymous reviewer's identity in the log | 8f, 8g | No |
