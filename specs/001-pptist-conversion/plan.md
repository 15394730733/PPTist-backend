# Implementation Plan: PPTX to PPTist Encrypted Conversion

**Branch**: `001-pptist-conversion` | **Date**: 2026-02-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pptist-conversion/spec.md`

## Summary

Convert PPTX files to encrypted .pptist format that can be directly imported into PPTist. The system parses PPTX using Office Open XML libraries, transforms elements to PPTist-compatible JSON structure, encrypts with AES (CryptoJS), and returns the encrypted file for download.

## Technical Context

**Language/Version**: TypeScript 5+ / Node.js 20+ LTS
**Primary Dependencies**: Fastify, crypto-js, jszip, @fastify/multipart, Zod, Pino
**Storage**: N/A (in-memory processing, optional temp directory for large files)
**Testing**: Vitest
**Target Platform**: Node.js server (Linux/Docker)
**Project Type**: single
**Performance Goals**: <30s for standard files (≤10MB, ≤20 slides), 10 concurrent requests
**Constraints**: 50MB max file size, AES encryption required, ±1px coordinate precision
**Scale/Scope**: Single conversion service, plugin-based extensibility

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Extensibility First | ✅ | Plugin-based element converters, each converter independently extensible |
| II. Node.js Ecosystem | ✅ | Using Fastify, jszip, crypto-js - established npm packages |
| III. Module Boundaries | ✅ | Clear module interfaces: parser → converter → serializer → encryptor |
| IV. Configuration Driven | ✅ | File size limits, concurrency, encryption key via env vars |
| V. Progressive Enhancement | ✅ | Core conversion first, optional converters load on demand |

**Violations requiring justification**: None

## Project Structure

### Documentation (this feature)

```text
specs/001-pptist-conversion/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-v1.yaml
├── checklists/          # Quality checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts                 # Application entry point
├── app.ts                   # Fastify app configuration
├── config/
│   └── index.ts             # Configuration management
├── modules/
│   └── conversion/
│       ├── index.ts             # Conversion module (Fastify plugin)
│       ├── routes/
│       │   └── convert.ts       # POST /api/v1/convert endpoint
│       ├── services/
│       │   ├── parser.ts        # PPTX parsing service
│       │   ├── converter.ts     # Element conversion orchestrator
│       │   ├── serializer.ts    # PPTist JSON serializer
│       │   └── encryptor.ts     # AES encryption service
│       ├── converters/          # Element type converters (plugin pattern)
│       │   ├── index.ts         # Converter registry
│       │   ├── text.ts          # Text element converter
│       │   ├── image.ts         # Image element converter
│       │   ├── shape.ts         # Shape element converter
│       │   ├── video.ts         # Video element converter
│       │   ├── table.ts         # Table element converter
│       │   ├── chart.ts         # Chart element converter
│       │   ├── line.ts          # Line element converter
│       │   ├── audio.ts         # Audio element converter
│       │   └── latex.ts         # LaTeX element converter
│       ├── detectors/           # Element detection utilities
│       │   ├── password.ts      # Password protection detector
│       │   └── unsupported.ts   # Unsupported element detector
│       └── types/
│           ├── pptx.ts          # PPTX internal types
│           └── pptist.ts        # PPTist output types
├── utils/
│   ├── crypto.ts            # CryptoJS wrapper
│   ├── logger.ts            # Pino logger wrapper
│   └── errors.ts            # Custom error classes
└── types/
    └── index.ts             # Shared type definitions

tests/
├── unit/
│   ├── converters/          # Unit tests for each converter
│   ├── parser.test.ts
│   └── encryptor.test.ts
├── integration/
│   └── conversion.test.ts   # End-to-end conversion tests
└── fixtures/
    ├── simple.pptx          # Test fixture files
    └── complex.pptx
```

**Structure Decision**: Single project with modular conversion plugin. The `modules/conversion/` directory follows the plugin pattern for extensibility - new converters can be added without modifying existing code.
