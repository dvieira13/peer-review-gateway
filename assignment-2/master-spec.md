# Master Spec: Domain 3 - Peer Review & Evaluation Gateway

*Source: professor's Project Portal Domain Service document, Domain 3.*

## Overview

This service handles the formal academic grading matrix, enabling faculty, course instructors, and student peers to process, aggregate, and review structured evaluation rubrics and scores for published works.

## Functional Requirements

1. **Evaluation Rubric Management:** uniquely identify (UUID), initialize and maintain structured evaluation rubrics. Rubrics must store hierarchical grading criteria (score weights, text descriptions, max point bounds). Rubrics must support flexible scoping: a rubric can be defined for a single specific Project ID, a set of projects belonging to the same Course ID, or an entire Research Lab ID. The database must enforce a relationship where each project is bound to exactly one governing rubric, while a single rubric may govern multiple projects simultaneously.

2. **Multi-Role Scoring and Verification Constraints:** Process submitted evaluations from multiple roles, separating faculty_instructor rubrics from anonymous student_peer reviews.

3. **Evaluation and Grade Aggregation:** Automatically aggregate multi-reviewer scores to calculate final performance metrics (mean scores, weighted grade point trends, standard deviations), separating faculty_instructor evaluations from anonymous student_peer reviews, and output aggregated grade reports.

4. **Complex Multi-Field Query:** Support high-level search and filtering across the evaluation matrix. Instructors must be able to search and sort grade reports and raw review comments by specific project IDs, minimum score limits, academic lab affiliations, and course sections.

## REST APIs

| Endpoint | Verbs | Description |
|---|---|---|
| `/api/v1/evaluations/rubrics` | POST | Initialize an evaluation schema or rubric definition. |
| `/api/v1/evaluations/rubrics` | GET | Query parameters enable users to find active rubrics scoped by a specific Project ID, Course ID, or Lab ID. |
| `/api/v1/evaluations/rubrics/{rubric_id}` | GET, PUT, DELETE | Read, update, or remove an evaluation schema or rubric definition. A rubric cannot be modified or deleted if it is in use. |
| `/api/v1/evaluations/projects/{project_id}/summary` | GET | Read an isolated, aggregated summary report for a specific project. The JSON payload must programmatically separate statistical averages, mean scores, and grade distribution into distinct, un-conflated blocks for faculty evaluations and peer-review feedback. |
| `/api/v1/evaluations/projects/{project_id}/reviews` | POST | Submit an individual evaluation payload (containing raw scores and text criteria feedback) matching a specific rubric target. |
| `/api/v1/evaluations/projects/{project_id}/reviews` | GET | Read a filtered stream of raw entries. Minimum grades can be passed as the query filter. |
| `/api/v1/evaluations/projects/{project_id}/reviews/{review_id}` | GET, PUT, DELETE | Read, update, or remove a specific review for a given project. |
| `/api/v1/evaluations/reports` | GET | Generate and export macro-level evaluation metrics and composite grade matrices. Passing query filters (such as `?course_id=CS501` or `?lab_id=lab_cybersec`) instructs the service to output a single, consolidated report file compiling the grading status and performance summaries of all projects associated with that particular Course or Research Lab. |
