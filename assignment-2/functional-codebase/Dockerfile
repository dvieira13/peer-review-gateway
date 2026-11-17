# syntax=docker/dockerfile:1
# Tool: Claude (claude.ai chat, Claude Sonnet 5.5), 2026-11-01, carried over from the Assignment 1 stack
# Prompt Summary: Multi-stage Node 24 Docker build with a non-root runtime image for the gateway.
# AI Contribution: 100%
# Human Modifications: Carried over from the Assignment 1 Dockerfile; the header was reformatted to the Assignment 2 fields.
# Verification: Built and run with Docker Compose by the author (smoke test); the image was scanned by Trivy in CI run #34.
# Confidence: Medium. It builds and runs as a non-root user, but the base image is not pinned by digest (see the TODO below).
# Multi-stage build: deps -> build -> prod-deps -> runtime (non-root, minimal)
# TODO(hardening): pin base image by digest (node:22-alpine@sha256:...)

ARG NODE_VERSION=24

# ---- Stage 1: all dependencies (incl. dev) ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: compile TypeScript ----
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Stage 3: production dependencies only ----
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Stage 4: runtime ----
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/server.js"]
