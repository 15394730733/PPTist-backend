# Feature Specification: PPTX to PPTist Encrypted Conversion

**Feature Branch**: `001-pptist-conversion`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "加密后的文件名为pptist-Conversion.pptist 可以直接导入到PPTist中使用"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single File Conversion (Priority: P1)

As a PPTist user, I want to upload a PPTX file and receive an encrypted .pptist file that I can directly import into PPTist, so that I can use my existing PowerPoint presentations in PPTist without manual recreation.

**Why this priority**: This is the core value proposition - enabling users to migrate their existing PowerPoint content to PPTist. Without this, the feature has no utility.

**Independent Test**: Upload a valid PPTX file, receive a .pptist file, import it into PPTist, and verify all slides and elements are preserved.

**Acceptance Scenarios**:

1. **Given** a user has a valid PPTX file, **When** they upload it to the conversion endpoint, **Then** they receive a downloadable .pptist file named `pptist-Conversion.pptist`
2. **Given** a converted .pptist file, **When** the user imports it into PPTist, **Then** all slides are displayed correctly with preserved layout and content
3. **Given** a PPTX file with images and shapes, **When** converted, **Then** the .pptist file contains all visual elements in their original positions

---

### User Story 2 - Error Handling for Invalid Files (Priority: P2)

As a user, I want to receive clear error messages when I upload an invalid or corrupted file, so that I understand what went wrong and can take corrective action.

**Why this priority**: Essential for user experience - prevents frustration when things go wrong.

**Independent Test**: Upload various invalid files (corrupted, wrong format, empty) and verify appropriate error messages are returned.

**Acceptance Scenarios**:

1. **Given** a user uploads a non-PPTX file, **When** the conversion is attempted, **Then** an error message clearly states "Invalid file format: only PPTX files are supported"
2. **Given** a user uploads a corrupted PPTX file, **When** the conversion fails, **Then** an error message indicates the file is corrupted and cannot be processed
3. **Given** a user uploads an empty file, **When** the conversion is attempted, **Then** an error message states "File is empty or contains no slides"

---

### User Story 3 - Large File Support (Priority: P3)

As a user with large presentations, I want to convert PPTX files up to 50MB without errors, so that I can migrate my comprehensive presentations to PPTist.

**Why this priority**: Enhances feature reach but core functionality works without it.

**Independent Test**: Upload PPTX files of varying sizes (10MB, 30MB, 50MB) and verify successful conversion within acceptable time limits.

**Acceptance Scenarios**:

1. **Given** a 50MB PPTX file, **When** uploaded for conversion, **Then** the system processes it within 60 seconds
2. **Given** a file exceeding the size limit, **When** uploaded, **Then** an error message indicates the size limit and suggests compression options

---

### Edge Cases & Handling Strategy

| 边缘情况 | 处理策略 | 错误码/警告 |
|----------|----------|-------------|
| 嵌入视频 | ✅ 支持：提取视频并保留引用 | 无 |
| 嵌入音频 | ✅ 支持：提取音频并保留引用 | 无 |
| LaTeX 公式 | ✅ 支持：转换为 PPTist latex 元素 | 无 |
| SmartArt | ⚠️ 跳过：显示占位矩形 + 警告 | `WARN_SMARTART_SKIPPED` |
| 宏/VBA | ⚠️ 跳过：完全忽略 + 警告 | `WARN_MACRO_SKIPPED` |
| ActiveX 控件 | ⚠️ 跳过：完全忽略 + 警告 | `WARN_ACTIVEX_SKIPPED` |
| 密码保护文件 | ❌ 拒绝：返回错误，建议解除保护 | `ERR_PROTECTED_FILE` |
| 特殊字体 | 🔄 回退：使用系统默认字体，保留原始字体名 | `WARN_FONT_FALLBACK` |
| 超大文件(>50MB) | ❌ 拒绝：返回错误，建议压缩 | `ERR_FILE_TOO_LARGE` |

## API Specification *(mandatory)*

### Upload Endpoint

```
POST /api/v1/convert
Content-Type: multipart/form-data
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | PPTX file (max 50MB) |

**Response (Success):**
```
HTTP 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="pptist-Conversion.pptist"

<encrypted binary data>
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "ERR_PROTECTED_FILE",
    "message": "Password-protected files are not supported",
    "suggestion": "Please remove password protection and try again"
  },
  "warnings": ["WARN_SMARTART_SKIPPED: 2 SmartArt elements were skipped"]
}
```

### Response Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ERR_INVALID_FORMAT` | 400 | File is not a valid PPTX |
| `ERR_FILE_TOO_LARGE` | 413 | File exceeds 50MB limit |
| `ERR_PROTECTED_FILE` | 400 | File is password protected |
| `ERR_CORRUPTED_FILE` | 400 | File is corrupted or unreadable |
| `ERR_EMPTY_FILE` | 400 | File contains no slides |
| `ERR_CONVERSION_FAILED` | 500 | Internal conversion error |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept PPTX files as input for conversion
- **FR-002**: System MUST output encrypted .pptist files named `pptist-Conversion.pptist`
- **FR-003**: System MUST preserve slide structure, layout, and element positioning during conversion (coordinate precision: ±1 pixel)
- **FR-004**: System MUST preserve text content, including formatting (bold, italic, font size)
- **FR-005**: System MUST preserve images and embedded videos from the PPTX file
- **FR-006**: System MUST preserve basic shapes: rectangles, circles, ellipses, lines, arrows, text boxes
- **FR-007**: System MUST support Chinese and other non-Latin character sets (UTF-8)
- **FR-008**: System MUST return meaningful error messages for invalid inputs with specific error codes
- **FR-009**: System MUST validate input file format before processing
- **FR-010**: System MUST complete conversion within 30 seconds for standard files (≤10MB, ≤20 slides)
- **FR-011**: Output file MUST be directly importable into PPTist without additional processing
- **FR-012**: System MUST encrypt the output file content using AES encryption (CryptoJS compatible) with key `pptist`
- **FR-013**: System MUST support up to 10 concurrent conversion requests
- **FR-014**: System MUST reject password-protected PPTX files with clear error message
- **FR-015**: System MUST skip unsupported elements (SmartArt, macros, ActiveX) and include warnings in response
- **FR-016**: System MUST handle font fallback gracefully when original fonts are unavailable

### Output File Format

The `.pptist` file structure (before encryption):
```
JSON structure:
{
  "slides": [...],      // Slide array with elements
  "media": {...},       // Embedded media (images, videos)
  "metadata": {...},    // Conversion metadata
  "warnings": [...]     // Any conversion warnings
}
```

After encryption: AES-encrypted string (CryptoJS format)

### Key Entities

- **ConversionRequest**: Represents a single conversion task with input file reference, status, and output reference
- **PPTXDocument**: Represents the parsed PowerPoint structure with slides, elements, and metadata
- **PPTistFile**: Represents the encrypted output format containing converted presentation data
- **ConversionError**: Represents error information with code, message, and user-friendly description
- **ConversionWarning**: Represents non-fatal issues encountered during conversion

### Assumptions

- Input files are standard Office Open XML (PPTX) format
- Users have access to PPTist application for importing the converted files
- No persistent storage required: process files in memory or temp directory
- Standard PPTX features are supported; advanced features are handled per edge case strategy
- Encryption is applied to ensure format compatibility with PPTist frontend

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can convert a standard 10-slide PPTX file and import it into PPTist in under 2 minutes
- **SC-002**: System achieves 95% visual fidelity for standard slide elements (text, images, shapes)
- **SC-003**: 90% of users successfully complete their first conversion without assistance
- **SC-004**: System processes 10 concurrent conversion requests without performance degradation (response time increase < 50%)
- **SC-005**: Error messages are understood by users without technical support in 85% of error cases
- **SC-006**: All text content, including Chinese characters, is preserved accurately after conversion
- **SC-007**: 100% of embedded videos are preserved and playable in PPTist
