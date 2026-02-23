# Quickstart: Dual Output Format

This guide helps you quickly test the dual output format feature.

## Prerequisites

- PPTist backend running (see main README.md)
- A PPTX file for testing

## Testing the API

### Dual Output (Both Formats)

```bash
# Get both JSON and encrypted formats
curl -X POST "http://localhost:3000/api/v1/convert?format=both" \
  -F "file=@presentation.pptx"

# Response:
# {
#   "json": { "slides": [...], "media": {...}, ... },
#   "pptist": "U2FsdGVkX1..."
# }
```

### JSON Only

```bash
# Get only JSON format (for debugging/integration)
curl -X POST "http://localhost:3000/api/v1/convert?format=json" \
  -F "file=@presentation.pptx" \
  --output pptist-Conversion.json

# Open the JSON file
cat pptist-Conversion.json | jq '.slides[0]'
```

### PPTist Only (Default - Backward Compatible)

```bash
# Get only encrypted format (backward compatible with existing clients)
curl -X POST "http://localhost:3000/api/v1/convert" \
  -F "file=@presentation.pptx" \
  --output pptist-Conversion.pptist

# Or explicitly specify format
curl -X POST "http://localhost:3000/api/v1/convert?format=pptist" \
  -F "file=@presentation.pptx" \
  --output pptist-Conversion.pptist
```

## Response Comparison

| Format | Content-Type | Use Case |
|--------|--------------|----------|
| `both` | application/json | Debugging, integration, maximum flexibility |
| `json` | application/json | API integration, custom processing |
| `pptist` | application/octet-stream | Direct PPTist import (default) |

## Using in JavaScript/TypeScript

```typescript
import FormData from 'form-data'
import fs from 'fs'
import axios from 'axios'

async function convertPptx(filePath: string, format: 'both' | 'json' | 'pptist' = 'pptist') {
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))

  const response = await axios.post(
    `http://localhost:3000/api/v1/convert?format=${format}`,
    form,
    { headers: form.getHeaders() }
  )

  if (format === 'both') {
    return {
      json: response.data.json,    // PPTist presentation object
      pptist: response.data.pptist  // Encrypted string
    }
  }

  return response.data
}

// Usage examples
const dual = await convertPptx('./presentation.pptx', 'both')
console.log('Slides:', dual.json.slides.length)
console.log('Encrypted size:', dual.pptist.length)

const json = await convertPptx('./presentation.pptx', 'json')
console.log('JSON response:', json)

const pptist = await convertPptx('./presentation.pptx', 'pptist')
// pptist is binary/encrypted data
```

## Decrypting PPTist Output

If you need to decrypt the .pptist content:

```typescript
import CryptoJS from 'crypto-js'

const key = 'pptist'
const decrypted = CryptoJS.AES.decrypt(encryptedString, key)
const presentation = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8))
```

## Error Handling

```bash
# Invalid format parameter
curl -X POST "http://localhost:3000/api/v1/convert?format=invalid" \
  -F "file=@presentation.pptx"

# Response:
# {
#   "success": false,
#   "error": {
#     "code": "ERR_INVALID_FORMAT",
#     "message": "Invalid format parameter. Must be: both, json, or pptist"
#   }
# }
```

## Backward Compatibility

Existing clients calling `/api/v1/convert` without the `format` parameter will receive the encrypted .pptist file (same as before). This ensures no breaking changes for existing integrations.
