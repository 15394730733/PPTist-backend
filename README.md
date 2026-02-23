# PPTist Backend

PPTX to PPTist encrypted format conversion service with dual output support.

## Features

- 📄 Convert PPTX files to PPTist-compatible format
- 🔒 AES encryption (CryptoJS compatible)
- 📦 Dual output: JSON + encrypted formats
- 🚀 Fast streaming processing
- 📦 Support for images, videos, audio, charts, tables, and more
- 🛡️ Rate limiting and file validation

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start development server
npm run dev
```

Server will start at http://localhost:3000

## API Endpoints

### POST /api/v1/convert

Upload a PPTX file and receive converted output in your preferred format.

**Query Parameters:**
| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `format` | `both`, `json`, `pptist` | `pptist` | Output format |

**Request:**
```
POST /api/v1/convert?format=both
Content-Type: multipart/form-data

file: <PPTX file>
```

**Response by Format:**

#### format=both (Dual Output)
```json
{
  "json": {
    "slides": [...],
    "media": {...},
    "metadata": {...},
    "warnings": []
  },
  "pptist": "U2FsdGVkX1..."
}
```

#### format=json (JSON Only)
```
HTTP 200 OK
Content-Type: application/json
Content-Disposition: attachment; filename="pptist-Conversion.json"

{
  "slides": [...],
  "media": {...},
  "metadata": {...},
  "warnings": []
}
```

#### format=pptist (Encrypted Only - Default)
```
HTTP 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="pptist-Conversion.pptist"

<encrypted binary data>
```

### Health Endpoints

- `GET /api/v1/health` - Health check with memory status
- `GET /api/v1/ready` - Readiness probe
- `GET /api/v1/live` - Liveness probe

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ERR_INVALID_FORMAT` | 400 | File is not a valid PPTX |
| `ERR_FILE_TOO_LARGE` | 413 | File exceeds 50MB limit |
| `ERR_PROTECTED_FILE` | 400 | Password-protected files not supported |
| `ERR_CORRUPTED_FILE` | 400 | File is corrupted or unreadable |
| `ERR_EMPTY_FILE` | 400 | File contains no slides |
| `ERR_CONVERSION_FAILED` | 500 | Internal conversion error |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `MAX_FILE_SIZE` | 52428800 | Max file size (50MB) |
| `CRYPTO_KEY` | pptist | AES encryption key |
| `RATE_LIMIT_MAX` | 10 | Max concurrent requests |
| `RATE_LIMIT_WINDOW` | 60000 | Rate limit window (ms) |
| `LOG_LEVEL` | info | Log level |
| `DEFAULT_OUTPUT_FORMAT` | pptist | Default output format (both, json, pptist) |

## Scripts

```bash
npm run dev          # Development with hot reload
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run typecheck    # TypeScript type check
npm run lint         # ESLint check
npm run format       # Prettier format
```

## Supported Elements

| Element | Support Level |
|---------|---------------|
| Text | ✅ Full support |
| Images | ✅ Full support |
| Shapes | ✅ Basic shapes |
| Lines | ✅ With arrow support |
| Videos | ✅ Embedded videos |
| Audio | ✅ Embedded audio |
| Tables | ✅ Basic tables |
| Charts | ⚠️ Placeholder data |
| LaTeX | ⚠️ Requires LaTeX source |
| SmartArt | ⚠️ Skipped with warning |
| Macros | ⚠️ Skipped with warning |
| ActiveX | ⚠️ Skipped with warning |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Test dual output (both formats)
curl -X POST "http://localhost:3000/api/v1/convert?format=both" \
  -F "file=@test.pptx"

# Test JSON only
curl -X POST "http://localhost:3000/api/v1/convert?format=json" \
  -F "file=@test.pptx" \
  --output pptist-Conversion.json

# Test PPTist only (default - backward compatible)
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@test.pptx" \
  --output pptist-Conversion.pptist
```

## Importing into PPTist

1. Download the converted `.pptist` file
2. Open PPTist application
3. Go to **File** → **Import**
4. Select the `pptist-Conversion.pptist` file
5. The presentation will be loaded

## License

MIT
