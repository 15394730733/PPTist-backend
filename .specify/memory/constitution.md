<!--
  Sync Impact Report:
  - Version: 0.0.0 → 1.0.0 (MAJOR - Initial constitution ratification)
  - Modified principles: N/A (Initial creation)
  - Added sections: All sections (Core Principles, Technology Standards, Development Workflow, Governance)
  - Removed sections: N/A
  - Templates updated:
    ✅ plan-template.md - Aligned constitution check section
    ✅ spec-template.md - No changes needed
    ✅ tasks-template.md - No changes needed
  - Follow-up TODOs: None
-->

# PPTist Backend Constitution

## Core Principles

### I. XML-First Data Processing

**MANDATORY**: Backend MUST provide robust XML to JSON conversion capabilities as a core service offering.

**Rules**:
- XML parsing MUST handle PPT-specific XML structures (slides, shapes, text, styling)
- Conversion MUST preserve semantic meaning (no data loss in transformation)
- Output JSON MUST follow consistent, documented schema
- MUST support streaming for large files to avoid memory exhaustion
- Error handling MUST provide clear, actionable error messages

**Rationale**: PPTist is a presentation tool that deals heavily with PowerPoint files, which are fundamentally XML-based (Office Open XML format). The ability to reliably convert between XML and JSON representations is critical for processing, manipulation, and rendering of presentation data.

### II. Type Safety & Validation

**MANDATORY**: All data structures MUST be strongly typed and validated at runtime boundaries.

**Rules**:
- TypeScript MUST be used for all backend code
- Runtime validation (e.g., Zod, Joi) MUST be used for external inputs
- API contracts MUST be explicitly defined and enforced
- Invalid data MUST be rejected with descriptive error messages

**Rationale**: XML to JSON conversion is error-prone without strict typing. Strong types catch transformation bugs early, preventing corrupt data from propagating through the system.

### III. Performance at Scale

**MANDATORY**: System MUST handle large presentation files efficiently.

**Rules**:
- Processing SHOULD NOT block the event loop for extended periods
- Large files (>10MB) MUST use streaming processing
- Response time targets: p95 < 2s for typical presentation files
- Memory usage MUST be bounded and predictable

**Rationale**: Presentation files can contain hundreds of slides with rich media. Inefficient processing will degrade user experience and risk server stability.

### IV. Observability

**MANDATORY**: All operations MUST be logged and metrics MUST be collected.

**Rules**:
- Structured logging (JSON format) MUST be used
- Every conversion request MUST be logged with input size, output size, and duration
- Errors MUST include full context (file metadata, parsing stage, error details)
- Critical metrics (conversion rate, error rate, latency) MUST be exposed

**Rationale**: XML parsing is complex and error-prone. Without comprehensive logging, debugging conversion failures becomes nearly impossible, especially at scale.

### V. Test Coverage

**MANDATORY**: Critical paths MUST have automated tests.

**Rules**:
- Unit tests REQUIRED for all XML parsing logic
- Integration tests REQUIRED for end-to-end conversion workflows
- Test suite MUST include real-world PPT files (regression tests)
- Edge cases (malformed XML, empty files, nested structures) MUST be covered

**Rationale**: XML parsing has countless edge cases. Automated tests with real files prevent regressions when handling diverse presentation formats.

## Technology Standards

**Language**: TypeScript 5.x (Node.js runtime)
**Framework**: Express.js or Fastify (to be determined during architecture phase)
**Core Dependencies**:
- **XML Parsing**: `xml2js` or `fast-xml-parser` (evaluated in Phase 0)
- **Validation**: `zod` or `joi` (schema validation)
- **Streaming**: Node.js native streams + appropriate XML streaming parser
- **Logging**: `winston` or `pino` (structured logging)

**Storage**:
- File storage: Local filesystem (initial) / S3-compatible (future)
- Metadata storage: To be determined (PostgreSQL/SQLite)

**Testing**:
- Framework: `jest` or `vitest`
- HTTP testing: `supertest`
- Test data: Repository of real PPT files (test fixtures)

**Constraints**:
- Maximum file size: 100MB (configurable)
- Memory limit: 512MB per request
- Timeout: 30 seconds per conversion request

## Development Workflow

**Code Review Requirements**:
- All changes MUST pass type checking (`tsc --noEmit`)
- All tests MUST pass before merge
- Linting MUST pass (ESLint with strict rules)

**Quality Gates**:
- No `any` types without explicit justification comment
- All public APIs MUST have JSDoc comments
- Error handling MUST NOT use bare try-catch (must handle or rethrow)

**Documentation**:
- API contracts MUST be documented in OpenAPI/Swagger format
- JSON schemas MUST be exported and versioned
- Architecture decisions MUST be recorded in ADRs (Architecture Decision Records)

## Governance

**Constitution Authority**: This constitution supersedes all other project documentation. In case of conflict, this document takes precedence.

**Amendment Process**:
1. Proposal MUST include rationale and impact analysis
2. Changes MUST be reviewed and approved by project maintainers
3. Version MUST be incremented according to semantic versioning
4. All dependent templates MUST be updated for consistency
5. Migration plan REQUIRED for breaking changes

**Compliance Review**:
- All pull requests MUST verify constitution compliance
- Violations MUST be justified with complexity tracking (see plan-template.md)
- Periodic audits (quarterly) to ensure adherence

**Complexity Justification**:
- Any principle violation MUST be documented in plan.md Complexity Tracking section
- MUST explain why simpler alternative is insufficient
- MUST be reviewed during architecture phase

---

**Version**: 1.0.0 | **Ratified**: 2026-01-23 | **Last Amended**: 2026-01-23
