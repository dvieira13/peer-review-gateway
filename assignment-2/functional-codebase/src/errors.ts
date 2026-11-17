/*
 * Tool: Claude Code (claude-opus-5-5), 2026-11-16
 * Prompt Summary: Build the Domain 3 Peer Review & Evaluation Gateway from master-spec.md; this file defines HTTP error types and the JSON error handler.
 * AI Contribution: 100%
 * Human Modifications: None. Committed unedited as the naive baseline (commit aedffac).
 * Verification: typecheck, Vitest suite and build run by Claude Code on 2026-11-16; Author ran the stack in Docker Compose and exercised the endpoints with curl (checks 8a to 8j); CI run #34 passed.
 * Confidence: Medium. Typecheck, tests and the author's curl checks pass, but the code is naive and the author has not reviewed every line.
 */
import type { ErrorRequestHandler, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: string[]) =>
  new HttpError(400, 'bad_request', message, details);
export const notFound = (message: string) => new HttpError(404, 'not_found', message);
export const conflict = (message: string, details?: string[]) =>
  new HttpError(409, 'conflict', message, details);
export const unprocessable = (message: string, details?: string[]) =>
  new HttpError(422, 'unprocessable_entity', message, details);

/** Thrown by a store when a project is already bound to a rubric. */
export class ProjectAlreadyBoundError extends Error {
  constructor(public readonly projectIds: string[]) {
    super(`Project(s) already bound to a rubric: ${projectIds.join(', ')}`);
    this.name = 'ProjectAlreadyBoundError';
  }
}

/** Thrown by a store when the same reviewer reviews the same project twice. */
export class DuplicateReviewError extends Error {
  constructor() {
    super('This reviewer has already submitted a review for this project');
    this.name = 'DuplicateReviewError';
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }
  if (err instanceof ProjectAlreadyBoundError) {
    res.status(409).json({ error: { code: 'conflict', message: err.message, details: err.projectIds } });
    return;
  }
  if (err instanceof DuplicateReviewError) {
    res.status(409).json({ error: { code: 'conflict', message: err.message } });
    return;
  }
  // Malformed JSON body from express.json().
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_request', message: 'Request body is not valid JSON' } });
    return;
  }
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'Request body is too large' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } });
};
