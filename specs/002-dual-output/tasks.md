# Tasks: Dual Output Format

**Input**: Design documents from `/specs/002-dual-output/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are optional.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Note**: This is an enhancement to existing service (001-pptist-conversion). No setup/foundational tasks needed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Dual Format Download (Priority: P1) 🎯 MVP

**Goal**: Upload PPTX → Receive both JSON and encrypted formats in single response

**Independent Test**: Upload valid PPTX with format=both, verify response contains both `json` and `pptist` fields

### Implementation for User Story 1

- [x] T001 [P] [US1] Create response types in src/modules/conversion/types/response.ts (DualOutputResponse, FormatParameter)
- [x] T002 [US1] Create response formatter service in src/modules/conversion/services/response.ts (formatDual, formatJson, formatPptist functions)
- [x] T003 [US1] Update convert route to support format=both in src/modules/conversion/routes/convert.ts
- [x] T004 [US1] Add DEFAULT_OUTPUT_FORMAT to config in src/config/index.ts
- [x] T005 [US1] Add DEFAULT_OUTPUT_FORMAT to .env.example

**Checkpoint**: User Story 1 complete - can request dual output format

---

## Phase 2: User Story 2 - Output Format Selection (Priority: P2)

**Goal**: Allow clients to request single format via query parameter

**Independent Test**: Upload PPTX with format=json, verify only JSON returned; format=pptist, verify only encrypted file returned

### Implementation for User Story 2

- [x] T006 [US2] Add format parameter validation in convert route (zod schema for 'both'|'json'|'pptist')
- [x] T007 [US2] Update response formatter to handle single format output in src/modules/conversion/services/response.ts
- [x] T008 [US2] Update convert route to handle format=json and format=pptist in src/modules/conversion/routes/convert.ts
- [x] T009 [US2] Ensure backward compatibility: default format=pptist maintains existing behavior

**Checkpoint**: User Story 2 complete - clients can select output format

---

## Phase 3: Polish & Documentation

**Purpose**: Update documentation and add integration tests

- [x] T010 [P] Update README.md with dual output documentation
- [x] T011 [P] Create integration test for dual output in tests/integration/dual-output.test.ts
- [x] T012 Update quickstart.md with actual usage examples

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies - can start immediately
- **Phase 2 (US2)**: Depends on Phase 1 completion (needs response types and formatter)
- **Phase 3 (Polish)**: Depends on Phase 1 and 2 completion

### Within Each User Story

- T001 (types) before T002 (service) and T003 (route)
- T002 (service) before T003 (route)
- T004, T005 (config) can run in parallel with T001

### Parallel Opportunities

- T001, T004, T005 can run in parallel (different files)
- T010, T011 can run in parallel (different files)

---

## Parallel Example: Phase 1

```bash
# Launch parallel tasks:
Task: "Create response types in src/modules/conversion/types/response.ts"
Task: "Add DEFAULT_OUTPUT_FORMAT to config in src/config/index.ts"
Task: "Add DEFAULT_OUTPUT_FORMAT to .env.example"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: User Story 1 (5 tasks)
2. **STOP and VALIDATE**: Test dual output with curl
3. Deploy if ready

### Incremental Delivery

1. Phase 1 → Test dual output → Deploy/Demo (MVP!)
2. Phase 2 → Test format selection → Deploy/Demo
3. Phase 3 → Update docs → Deploy

---

## Notes

- This is an enhancement, not a new project
- Reuses existing conversion pipeline from 001-pptist-conversion
- Default format=pptist ensures backward compatibility
- Format parameter is case-insensitive

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 12 |
| **Phase 1 (US1 - MVP)** | 5 tasks |
| **Phase 2 (US2)** | 4 tasks |
| **Phase 3 (Polish)** | 3 tasks |
| **Parallel Opportunities** | ~5 tasks can run in parallel |
