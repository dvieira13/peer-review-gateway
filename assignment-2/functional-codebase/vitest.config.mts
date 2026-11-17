// Tool: Claude (claude.ai chat, Claude Sonnet 5.5), carried over from the Assignment 1 scaffold (commit 8cc76a5)
// Prompt Summary: Vitest settings: which tests to run and which files count toward coverage.
// AI Contribution: 100%
// Human Modifications: Copied from the Assignment 1 scaffold; the author added only this header.
// Verification: Used by the typecheck, test and build steps that ran in CI run #34 and in the Docker build.
// Confidence: High. It is standard configuration and the build, tests and Docker image all work with it.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'], include: ['src/**'] },
  },
});
