# Data Model: Dual Output Format

**Feature**: 002-dual-output
**Date**: 2026-02-20

## Overview

This document defines the response types for the dual output format feature. No new data entities are introduced - this feature only adds new response formats for existing presentation data.

## Response Types

### DualOutputResponse

Returned when `format=both` is specified.

```typescript
interface DualOutputResponse {
  json: PPTistPresentation    // Plain JSON presentation data
  pptist: string              // AES encrypted string
}
```

### SingleJsonResponse

Returned when `format=json` is specified.

```typescript
// Direct PPTistPresentation as response body
type SingleJsonResponse = PPTistPresentation
```

### SinglePptistResponse

Returned when `format=pptist` is specified (backward compatible default).

```typescript
// Binary/octet-stream response with encrypted content
// Headers: Content-Type: application/octet-stream
//          Content-Disposition: attachment; filename="pptist-Conversion.pptist"
```

## Existing Types (Reused)

### PPTistPresentation

From existing service (001-pptist-conversion):

```typescript
interface PPTistPresentation {
  slides: Slide[]
  media: MediaMap
  metadata: {
    sourceFormat: 'pptx'
    convertedAt: string
    version: string
  }
  warnings: string[]
}
```

## Query Parameters

### FormatParameter

```typescript
type FormatParameter = 'both' | 'json' | 'pptist'

// Validation schema
const formatSchema = z.enum(['both', 'json', 'pptist']).optional().default('pptist')
```

## Configuration

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEFAULT_OUTPUT_FORMAT` | 'both' \| 'json' \| 'pptist' | 'pptist' | Default format when not specified |

## Type Guards

```typescript
function isDualOutput(response: unknown): response is DualOutputResponse {
  return typeof response === 'object'
    && response !== null
    && 'json' in response
    && 'pptist' in response
}

function isSingleJson(response: unknown): response is PPTistPresentation {
  return typeof response === 'object'
    && response !== null
    && 'slides' in response
    && !('pptist' in response)
}
```

## Response Headers

### Dual Output
```
Content-Type: application/json; charset=utf-8
```

### JSON Only
```
Content-Type: application/json; charset=utf-8
Content-Disposition: attachment; filename="pptist-Conversion.json"
```

### PPTist Only (Existing)
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="pptist-Conversion.pptist"
```
