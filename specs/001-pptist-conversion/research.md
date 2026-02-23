# Research: PPTX to PPTist Conversion

**Feature**: 001-pptist-conversion
**Date**: 2026-02-20

## Technology Decisions

### 1. PPTX Parsing Library

**Decision**: jszip + manual XML parsing

**Rationale**:
- PPTX is a ZIP archive containing XML files
- jszip is mature, well-maintained, and has 0 dependencies
- Manual XML parsing with native DOMParser gives full control
- Avoids heavy dependencies like officegen or pptxgenjs (which are for generation, not parsing)

**Alternatives Considered**:
| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| jszip | Lightweight, streaming support | Manual XML parsing needed | ✅ Selected |
| adm-zip | Simple API | No streaming, sync only | ❌ |
| unzipper | Streaming | Less maintained | ❌ |
| officeparser | High-level API | Heavy, Python dependency | ❌ |

### 2. XML Parsing Strategy

**Decision**: Native DOMParser via xmldom or fast-xml-parser

**Rationale**:
- fast-xml-parser is 2x faster than xmldom
- Better for large PPTX files with many slides
- Supports attribute parsing and namespaces

**Alternatives Considered**:
| Library | Speed | Bundle Size | TypeScript |
|---------|-------|-------------|------------|
| fast-xml-parser | Very fast | Small | ✅ |
| xmldom | Medium | Medium | ✅ |
| xml2js | Slow | Large | ✅ |

### 3. Encryption Library

**Decision**: crypto-js

**Rationale**:
- PPTist frontend uses crypto-js with key `pptist`
- Must use same library for compatibility
- AES encryption is industry standard

**Code Reference**: `/PPTist/src/utils/crypto.ts`
```typescript
import CryptoJS from 'crypto-js'
const CRYPTO_KEY = 'pptist'
export const encrypt = (msg: string) => {
  return CryptoJS.AES.encrypt(msg, CRYPTO_KEY).toString()
}
```

### 4. Web Framework

**Decision**: Fastify

**Rationale**:
- Constitutional requirement (see `.specify/memory/constitution.md`)
- Native plugin architecture for extensibility
- Built-in schema validation with JSON Schema
- Superior performance vs Express

**Key Plugins**:
- `@fastify/multipart` - File upload handling
- `@fastify/cors` - Cross-origin support
- `@fastify/rate-limit` - Request rate limiting

### 5. Validation Library

**Decision**: Zod

**Rationale**:
- Constitutional requirement
- TypeScript-first with type inference
- Excellent error messages
- Runtime validation for file metadata

## PPTX Structure Analysis

### File Layout
```
.pptx (ZIP archive)
├── [Content_Types].xml      # Content type definitions
├── _rels/
│   └── .rels                # Package relationships
├── docProps/
│   ├── app.xml              # Application properties
│   └── core.xml             # Document properties
└── ppt/
    ├── presentation.xml     # Main presentation structure
    ├── _rels/
    │   └── presentation.xml.rels
    ├── slideLayouts/        # Slide layout templates
    ├── slideMasters/        # Master slide definitions
    ├── slides/
    │   ├── slide1.xml       # Individual slides
    │   └── _rels/
    └── media/               # Embedded media (images, videos)
```

### Key XML Namespaces
```xml
<p:presentation>    # http://schemas.openxmlformats.org/presentationml/2006/main
<a:t>               # http://schemas.openxmlformats.org/drawingml/2006/main
<a:r>               # DrawingML run
<a:p>               # DrawingML paragraph
<p:sp>              # Shape
<p:pic>             # Picture
<p:graphicFrame>    # Chart/Table
```

### Element Mapping

| PPTX Element | PPTist Type | Priority |
|--------------|-------------|----------|
| p:sp (text) | text | P1 |
| p:pic | image | P1 |
| p:sp (shape) | shape | P1 |
| p:cxnSp | line | P1 |
| p:graphicFrame (chart) | chart | P2 |
| p:graphicFrame (table) | table | P2 |
| p:pic (video) | video | P1 |
| p:pic (audio) | audio | P3 |
| p:diag | SmartArt | ⚠️ Skip + Warn |
| v:OleObject | ActiveX | ⚠️ Skip + Warn |

## Coordinate System

### PPTX (EMU - English Metric Units)
- 1 inch = 914,400 EMU
- 1 pixel (96 DPI) = 9,525 EMU
- Slide size: typically 9,144,000 × 6,858,000 EMU (10" × 7.5")

### PPTist (Pixels)
- Default canvas: 1280 × 720 px (16:9)
- Conversion ratio: 1 EMU = 0.0001398 px at 1280px width

### Conversion Formula
```typescript
const SLIDE_WIDTH_EMU = 9144000;
const SLIDE_HEIGHT_EMU = 6858000;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

function emuToPixel(emu: number, slideSize: number, canvasSize: number): number {
  return Math.round((emu / slideSize) * canvasSize);
}
```

## Password Detection

Encrypted PPTX files have a different structure:
- Contains `EncryptionInfo` stream
- Standard ZIP tools may still open it but content is encrypted

**Detection Strategy**:
1. Check for `EncryptedPackage` entry in ZIP
2. Attempt to parse presentation.xml - if fails, likely encrypted
3. Return `ERR_PROTECTED_FILE` error code

## Performance Considerations

### Memory Management
- Stream ZIP entries instead of loading entire file
- Process slides sequentially to limit memory footprint
- Clear parsed data after each slide

### Concurrent Request Handling
- Fastify handles concurrent requests natively
- Use connection pooling for any external resources
- Implement rate limiting: 10 concurrent conversions max

### Large File Strategy
- Files >10MB: use temp directory for extraction
- Stream processing where possible
- Progress tracking for long conversions (optional)

## Security Considerations

### Input Validation
- Magic byte check for ZIP format (PK\x03\x04)
- File extension validation
- Size limit enforcement (50MB max)

### Output Safety
- Encrypt all output content
- No persistent storage of uploaded files
- Sanitize any error messages

## References

1. [Office Open XML Format Specification](https://docs.microsoft.com/en-us/office/open-xml/open-xml-sdk)
2. [PPTist Source Code](/PPTist/src/types/slides.ts)
3. [CryptoJS Documentation](https://cryptojs.gitbook.io/docs/)
4. [Fastify Documentation](https://fastify.dev/)
