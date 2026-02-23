# Tasks: PPTX to PPTist Conversion

**Input**: Design documents from `/specs/001-pptist-conversion/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are optional.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Node.js project with package.json (name: pptist-backend, type: module)
- [x] T002 [P] Install core dependencies: fastify, @fastify/multipart, crypto-js, jszip, zod, pino
- [x] T003 [P] Install dev dependencies: typescript, vitest, @types/node, eslint, prettier
- [x] T004 [P] Create tsconfig.json with Node.js 20+ target and ESM module
- [x] T005 [P] Create vitest.config.ts for test configuration
- [x] T006 [P] Create .env.example with PORT, HOST, MAX_FILE_SIZE, CRYPTO_KEY, RATE_LIMIT_MAX
- [x] T007 [P] Create .gitignore for node_modules, dist, .env, *.log
- [x] T008 [P] Create ESLint configuration in eslint.config.js
- [x] T009 Create project directory structure per plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Create shared types in src/types/index.ts (ErrorCode, WarningCode, EnvConfig)
- [x] T011 [P] Create utility: src/utils/logger.ts (Pino wrapper with pretty print for dev)
- [x] T012 [P] Create utility: src/utils/crypto.ts (CryptoJS AES encrypt/decrypt with key 'pptist')
- [x] T013 [P] Create utility: src/utils/errors.ts (ConversionError, ConversionWarning classes)
- [x] T014 Create configuration: src/config/index.ts (env validation with Zod, exports config object)
- [x] T015 Create Fastify app: src/app.ts (register plugins, middleware, error handling)
- [x] T016 Create entry point: src/index.ts (start server with config)
- [x] T017 Create PPTX internal types: src/modules/conversion/types/pptx.ts (PPTXSlide, PPTXElement)
- [x] T018 [P] Create PPTist output types: src/modules/conversion/types/pptist.ts (all element types from data-model.md)
- [x] T019 Create converter registry: src/modules/conversion/converters/index.ts (register/get converter pattern)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Single File Conversion (Priority: P1) 🎯 MVP

**Goal**: Upload PPTX → Receive encrypted .pptist file with preserved slides and elements

**Independent Test**: Upload valid PPTX, receive .pptist file, import to PPTist, verify slides preserved

### Implementation for User Story 1

- [x] T020 [P] [US1] Create text converter: src/modules/conversion/converters/text.ts
- [x] T021 [P] [US1] Create shape converter: src/modules/conversion/converters/shape.ts
- [x] T022 [P] [US1] Create image converter: src/modules/conversion/converters/image.ts
- [x] T023 [P] [US1] Create line converter: src/modules/conversion/converters/line.ts
- [x] T024 [P] [US1] Create video converter: src/modules/conversion/converters/video.ts
- [x] T025 [P] [US1] Create audio converter: src/modules/conversion/converters/audio.ts
- [x] T026 [P] [US1] Create table converter: src/modules/conversion/converters/table.ts
- [x] T027 [P] [US1] Create chart converter: src/modules/conversion/converters/chart.ts
- [x] T028 [P] [US1] Create latex converter: src/modules/conversion/converters/latex.ts
- [x] T029 [US1] Create PPTX parser service: src/modules/conversion/services/parser.ts (jszip + XML parsing)
- [x] T030 [US1] Create element converter orchestrator: src/modules/conversion/services/converter.ts (dispatch to converters)
- [x] T031 [US1] Create PPTist serializer: src/modules/conversion/services/serializer.ts (JSON structure assembly)
- [x] T032 [US1] Create encryptor service: src/modules/conversion/services/encryptor.ts (wrap crypto.ts)
- [x] T033 [US1] Create unsupported element detector: src/modules/conversion/detectors/unsupported.ts
- [x] T034 [US1] Create conversion route: src/modules/conversion/routes/convert.ts (POST /api/v1/convert)
- [x] T035 [US1] Create conversion module: src/modules/conversion/index.ts (Fastify plugin, register routes)
- [x] T036 [US1] Register conversion module in src/app.ts
- [x] T037 [US1] Create test fixture: tests/fixtures/simple.pptx (3 slides with text, image, shape)

**Checkpoint**: User Story 1 should be fully functional - can convert basic PPTX files

---

## Phase 4: User Story 2 - Error Handling (Priority: P2)

**Goal**: Return clear, actionable error messages for invalid inputs

**Independent Test**: Upload invalid files (wrong format, corrupted, empty, protected) and verify error codes

### Implementation for User Story 2

- [x] T038 [P] [US2] Create password detector: src/modules/conversion/detectors/password.ts
- [x] T039 [US2] Add file validation in convert route: magic byte check, extension, size limit
- [x] T040 [US2] Add error response formatting in src/utils/errors.ts (toJSON method)
- [x] T041 [US2] Update convert route to return structured error responses per API spec
- [x] T042 [US2] Add error handling for corrupted/invalid PPTX in parser.ts
- [x] T043 [US2] Create test fixtures: tests/fixtures/invalid.txt, tests/fixtures/corrupted.pptx
- [x] T044 [US2] Add health check endpoint: GET /api/v1/health in src/modules/conversion/routes/health.ts

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Large File Support (Priority: P3)

**Goal**: Handle PPTX files up to 50MB efficiently within 60 seconds

**Independent Test**: Upload large PPTX files (10MB, 30MB, 50MB) and verify conversion succeeds

### Implementation for User Story 3

- [x] T045 [US3] Add streaming ZIP extraction option in parser.ts for large files
- [x] T046 [US3] Add temp directory handling for large file extraction in parser.ts
- [x] T047 [US3] Add file size validation with ERR_FILE_TOO_LARGE error in convert route
- [x] T048 [US3] Add request timeout configuration (60s for large files) in app.ts
- [x] T049 [US3] Add rate limiting middleware: @fastify/rate-limit in app.ts (10 concurrent)
- [x] T050 [US3] Create test fixture: tests/fixtures/large.pptx (or document how to create)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T051 [P] Add warning collection during conversion (WARN_SMARTART_SKIPPED, etc.)
- [x] T052 [P] Add font fallback handling in text.ts and shape.ts converters
- [x] T053 Add request logging with correlation IDs in app.ts
- [x] T054 [P] Add graceful shutdown handling in index.ts
- [x] T055 [P] Create README.md with setup and usage instructions
- [x] T056 Validate against quickstart.md scenarios manually
- [x] T057 [P] Add input validation schema with Zod in convert route

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Enhances US1 error handling but US1 works without it
- **User Story 3 (P3)**: Can start after Foundational - Enhances US1 for large files but US1 works without it

### Within Each User Story

- Converters (text, shape, image, etc.) can run in parallel
- Parser before converter orchestrator
- Converter orchestrator before serializer
- All services before route
- Route before module registration

### Parallel Opportunities

- T002-T009: All setup tasks can run in parallel
- T011-T013: All utilities can run in parallel
- T017-T018: Types can run in parallel
- T020-T026: All converters can run in parallel
- T036, T041: Error handling tasks can run in parallel

---

## Parallel Example: User Story 1 Converters

```bash
# Launch all converters for User Story 1 together:
Task: "Create text converter in src/modules/conversion/converters/text.ts"
Task: "Create shape converter in src/modules/conversion/converters/shape.ts"
Task: "Create image converter in src/modules/conversion/converters/image.ts"
Task: "Create line converter in src/modules/conversion/converters/line.ts"
Task: "Create video converter in src/modules/conversion/converters/video.ts"
Task: "Create audio converter in src/modules/conversion/converters/audio.ts"
Task: "Create table converter in src/modules/conversion/converters/table.ts"
Task: "Create chart converter in src/modules/conversion/converters/chart.ts"
Task: "Create latex converter in src/modules/conversion/converters/latex.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test conversion with simple PPTX file
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (converters + services)
   - Developer B: User Story 2 (error handling)
   - Developer C: User Story 3 (large file support)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 57 |
| **Phase 1 (Setup)** | 9 tasks |
| **Phase 2 (Foundational)** | 10 tasks |
| **Phase 3 (US1 - MVP)** | 18 tasks |
| **Phase 4 (US2)** | 7 tasks |
| **Phase 5 (US3)** | 6 tasks |
| **Phase 6 (Polish)** | 7 tasks |
| **Parallel Opportunities** | ~32 tasks can run in parallel within phases |
