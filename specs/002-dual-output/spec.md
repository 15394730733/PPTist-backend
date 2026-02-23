# Feature Specification: Dual Output Format

**Feature Branch**: `002-dual-output`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "实现一个简单的web服务，我上传pptx文件，服务会返回pptist-Conversion.json 和 pptist-Conversion.pptist 两个文件"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dual Format Download (Priority: P1)

As a PPTist user, I want to upload a PPTX file and receive both JSON and encrypted formats, so that I can use the JSON for debugging/integration and the encrypted file for direct PPTist import.

**Why this priority**: This is the core feature - providing dual output formats for maximum flexibility.

**Independent Test**: Upload a valid PPTX file, receive both `pptist-Conversion.json` and `pptist-Conversion.pptist` files, verify both contain valid content.

**Acceptance Scenarios**:

1. **Given** a user uploads a valid PPTX file, **When** the conversion completes, **Then** they receive both `pptist-Conversion.json` (plain JSON) and `pptist-Conversion.pptist` (encrypted) files
2. **Given** a received JSON file, **When** opened, **Then** it contains valid PPTist presentation structure
3. **Given** a received .pptist file, **When** decrypted, **Then** it matches the JSON content

---

### User Story 2 - Output Format Selection (Priority: P2)

As a developer, I want to optionally request only one format, so that I can reduce bandwidth when I only need one output type.

**Why this priority**: Provides flexibility but the dual output is the primary requirement.

**Independent Test**: Upload PPTX with format parameter, receive only the requested format.

**Acceptance Scenarios**:

1. **Given** a user requests only JSON format, **When** conversion completes, **Then** only `pptist-Conversion.json` is returned
2. **Given** a user requests only encrypted format, **When** conversion completes, **Then** only `pptist-Conversion.pptist` is returned
3. **Given** no format parameter is specified, **When** conversion completes, **Then** both formats are returned (default behavior)

---

### Edge Cases & Handling Strategy

| Edge Case | Handling Strategy | Error Code |
|-----------|-------------------|------------|
| Very large JSON output | Stream response or use chunked transfer | N/A |
| Format parameter invalid | Default to dual output with warning | N/A |
| JSON serialization fails | Return encrypted only with warning | N/A |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept PPTX files for conversion
- **FR-002**: System MUST return both JSON and encrypted formats by default
- **FR-003**: System MUST return `pptist-Conversion.json` with plain PPTist JSON structure
- **FR-004**: System MUST return `pptist-Conversion.pptist` with AES encrypted content
- **FR-005**: System MUST support optional `format` query parameter for single format output
- **FR-006**: System MUST ensure JSON and encrypted outputs contain identical presentation data
- **FR-007**: System MUST preserve all PPTist presentation fields in both output formats
- **FR-008**: System MUST validate format parameter values (both, json, pptist)
- **FR-009**: System MUST maintain backward compatibility with existing single-output clients

### Output File Format

**JSON Format (pptist-Conversion.json):**
```json
{
  "slides": [...],
  "media": {...},
  "metadata": {...},
  "warnings": [...]
}
```

**PPTist Format (pptist-Conversion.pptist):**
- AES encrypted string (CryptoJS format)
- Identical content to JSON when decrypted

### Key Entities

- **ConversionResponse**: Response containing one or both output formats
- **DualOutputResponse**: JSON response with both `json` and `pptist` fields
- **SingleOutputResponse**: Response with single format (file download or JSON body)

### Assumptions

- Default behavior returns both formats for maximum flexibility
- JSON format is returned inline for easy parsing
- Encrypted format uses same AES encryption as existing service
- Format parameter is case-insensitive

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive both output formats within 30 seconds for standard files
- **SC-002**: JSON output is valid and parseable in 100% of successful conversions
- **SC-003**: Encrypted output decrypts correctly in 100% of successful conversions
- **SC-004**: Format parameter validation rejects invalid values with clear error
- **SC-005**: Response size is under 100MB for 50MB input files
- **SC-006**: Existing single-format API consumers continue working without changes
