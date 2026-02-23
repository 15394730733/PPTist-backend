# Implementation Plan: Dual Output Format

**Branch**: `002-dual-output` | **Date**: 2026-02-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-dual-output/spec.md`

**Note**: This is an enhancement to the existing conversion service (001-pptist-conversion).

## Summary

Enhance the existing PPTX conversion service to return both JSON and encrypted formats simultaneously. Add a `format` query parameter to allow clients to request a single format when needed. Maintain backward compatibility for existing API consumers.

## Technical Context

**Language/Version**: TypeScript 5+ / Node.js 20+ LTS (existing)
**Primary Dependencies**: Fastify, crypto-js, jszip, zod (existing)
**Storage**: N/A (in-memory processing)
**Testing**: Vitest
**Target Platform**: Node.js server (Linux/Docker)
**Project Type**: single (enhancing existing service)
**Performance Goals**: Same as existing service (<30s for standard files)
**Constraints**: Response size <100MB for 50MB input
**Scale/Scope**: Enhance existing `/api/v1/convert` endpoint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Extensibility First | ✅ | Adding new response format without modifying core conversion logic |
| II. Node.js Ecosystem | ✅ | Using existing stack (Fastify, Zod) |
| III. Module Boundaries | ✅ | New response formatter module with clear interface |
| IV. Configuration Driven | ✅ | Default format configurable via env var |
| V. Progressive Enhancement | ✅ | Backward compatible - existing clients unaffected |

**Violations requiring justification**: None

## Project Structure

### Documentation (this feature)

```text
specs/002-dual-output/
├── plan.md              # This file
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code Changes

Enhance existing service structure:

```text
src/
├── modules/conversion/
│   ├── routes/
│   │   └── convert.ts           # ENHANCE: Add format parameter handling
│   ├── services/
│   │   ├── response.ts          # NEW: Response formatting service
│   │   └── serializer.ts        # EXISTING: No changes needed
│   └── types/
│       └── response.ts          # NEW: Response type definitions

tests/
├── unit/
│   └── response.test.ts         # NEW: Response formatter tests
└── integration/
    └── dual-output.test.ts      # NEW: Dual output integration tests
```

**Structure Decision**: Minimal changes to existing codebase. Add new response formatter module while reusing existing conversion pipeline.

## Implementation Approach

### Key Changes

1. **Add `format` query parameter** to `/api/v1/convert` endpoint
2. **Create response formatter** to handle different output modes
3. **Update route handler** to use formatter based on format parameter
4. **Add response types** for dual/single output modes

### Response Format by Mode

| format param | Response Type | Content |
|--------------|---------------|---------|
| `both` (default) | application/json | `{ json: {...}, pptist: "..." }` |
| `json` | application/json | Direct JSON body |
| `pptist` | application/octet-stream | Encrypted file download |

### Backward Compatibility

- Existing clients calling `/api/v1/convert` without format parameter receive dual output (breaking change consideration)
- Alternative: Default to `pptist` to maintain backward compatibility
- Decision: Use `pptist` as default for backward compatibility

## Complexity Tracking

No violations - this is a straightforward enhancement following existing patterns.
