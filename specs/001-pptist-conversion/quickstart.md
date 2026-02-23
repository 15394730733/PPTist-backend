# Quickstart: PPTX to PPTist Conversion

This guide helps you quickly set up and test the conversion service.

## Prerequisites

- Node.js 20+ LTS
- npm or pnpm
- A PPTX file for testing

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd PPTist-backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

## Configuration

Edit `.env` file:

```env
# Server
PORT=3000
HOST=0.0.0.0

# File Upload
MAX_FILE_SIZE=52428800  # 50MB in bytes

# Encryption (must match PPTist frontend)
CRYPTO_KEY=pptist

# Rate Limiting
RATE_LIMIT_MAX=10       # Max concurrent conversions
RATE_LIMIT_WINDOW=60000 # Window in ms
```

## Running the Service

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

The service will be available at `http://localhost:3000`.

## Testing the API

### Using cURL

```bash
# Convert a PPTX file
curl -X POST http://localhost:3000/api/v1/convert \
  -H "Content-Type: multipart/form-data" \
  -F "file=@presentation.pptx" \
  --output pptist-Conversion.pptist

# Health check
curl http://localhost:3000/api/v1/health
```

### Using HTTPie

```bash
# Convert a PPTX file
http -f POST http://localhost:3000/api/v1/convert file@presentation.pptx --download

# Health check
http http://localhost:3000/api/v1/health
```

### Using JavaScript/TypeScript

```typescript
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

async function convertPptx(filePath: string): Promise<Buffer> {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await axios.post('http://localhost:3000/api/v1/convert', form, {
    headers: form.getHeaders(),
    responseType: 'arraybuffer',
  });

  return Buffer.from(response.data);
}

// Usage
const encryptedFile = await convertPptx('./presentation.pptx');
fs.writeFileSync('pptist-Conversion.pptist', encryptedFile);
```

## Error Handling Examples

### Invalid File Format

```bash
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@document.pdf"

# Response:
# {
#   "success": false,
#   "error": {
#     "code": "ERR_INVALID_FORMAT",
#     "message": "File is not a valid PPTX",
#     "suggestion": "Please upload a PowerPoint (.pptx) file"
#   }
# }
```

### Password Protected File

```bash
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@protected.pptx"

# Response:
# {
#   "success": false,
#   "error": {
#     "code": "ERR_PROTECTED_FILE",
#     "message": "Password-protected files are not supported",
#     "suggestion": "Please remove password protection and try again"
#   }
# }
```

### Conversion with Warnings

```bash
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@complex.pptx" \
  --output pptist-Conversion.pptist \
  -w "\n%{http_code}"

# Response headers may include warnings:
# X-Warnings: [{"code":"WARN_SMARTART_SKIPPED","message":"2 SmartArt elements were skipped"}]
```

## Importing into PPTist

After downloading the `.pptist` file:

1. Open PPTist application
2. Go to **File** → **Import**
3. Select the `pptist-Conversion.pptist` file
4. The presentation will be decrypted and loaded

## Troubleshooting

### File Too Large

```
Error: File exceeds 50MB limit
```

**Solution**: Compress your PPTX file or reduce embedded media.

### Conversion Timeout

```
Error: Conversion timed out
```

**Solution**: The file may be too complex. Try simplifying the presentation.

### Missing Dependencies

```
Error: Cannot find module 'crypto-js'
```

**Solution**: Run `npm install` to install all dependencies.

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- conversion.test.ts
```

## Project Structure

```
src/
├── index.ts              # Entry point
├── app.ts                # Fastify app
├── config/               # Configuration
├── modules/
│   └── conversion/       # Conversion module
│       ├── routes/       # API routes
│       ├── services/     # Business logic
│       ├── converters/   # Element converters
│       └── types/        # TypeScript types
└── utils/                # Utility functions
```

## Next Steps

1. Review [plan.md](./plan.md) for implementation details
2. Check [data-model.md](./data-model.md) for type definitions
3. See [contracts/api-v1.yaml](./contracts/api-v1.yaml) for full API spec
