# Integration Tests for PPTX Conversion Service

This directory contains integration tests for the PPTX to JSON conversion service.

## Test Structure

```
tests/
├── helpers/
│   └── test-helpers.ts      # Test utility functions
├── fixtures/
│   ├── create-fixtures.ts   # Fixture generator
│   └── pptx/               # Test PPTX files
├── integration/
│   ├── batch-upload.test.ts # Batch upload tests
│   ├── batch-query.test.ts  # Batch query tests
│   └── batch-e2e.test.ts    # End-to-end tests
└── unit/                    # Unit tests (TBD)
```

## Prerequisites

### 1. Start the Test Server

```bash
# Terminal 1: Start the server
cd backend
npm run dev

# The server will start on port 3000 by default
```

### 2. Generate Test Fixtures (Optional)

```bash
# Create test PPTX files
npm run test:fixtures

# Or directly with tsx
npx tsx tests/fixtures/create-fixtures.ts
```

## Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Specific Test File

```bash
# Run only batch upload tests
npx vitest run tests/integration/batch-upload.test.ts

# Run only batch query tests
npx vitest run tests/integration/batch-query.test.ts

# Run only e2e tests
npx vitest run tests/integration/batch-e2e.test.ts
```

### Run Tests in Watch Mode

```bash
npx vitest tests/integration
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_URL` | `http://127.0.0.1:3001` | Base URL for test server |
| `NODE_ENV` | `test` | Environment |

### Using Custom Test Server

```bash
# Start server on port 3001
PORT=3001 npm run dev

# Run tests pointing to port 3001
TEST_URL=http://127.0.0.1:3001 npm run test:integration
```

## Test Categories

### 1. Batch Upload Tests (`batch-upload.test.ts`)

Tests the batch file upload functionality:

- ✅ Upload multiple valid PPTX files
- ✅ Handle partial failures (some invalid files)
- ✅ Reject too many files (>10)
- ✅ Reject empty file list
- ✅ Preserve original filenames
- ✅ Include file sizes in response
- ✅ Handle concurrent batch uploads

### 2. Batch Query Tests (`batch-query.test.ts`)

Tests the batch task status query functionality:

- ✅ Query multiple valid task IDs
- ✅ Calculate summary statistics
- ✅ Calculate overall progress
- ✅ Handle mix of valid and invalid task IDs
- ✅ Reject empty task ID array
- ✅ Reject too many task IDs (>100)
- ✅ Deduplicate repeated task IDs
- ✅ Track task status changes
- ✅ Handle concurrent queries

### 3. E2E Tests (`batch-e2e.test.ts`)

Tests the complete batch conversion workflow:

- ✅ Full workflow: upload → query → download
- ✅ Handle mixed success/failure scenarios
- ✅ Handle large batch uploads (10 files)
- ✅ Maintain task isolation
- ✅ Error recovery and continuation

## Test Helpers

### `httpRequest(method, url, options)`

Make HTTP requests to the test server.

```typescript
const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert/batch`, {
  headers: { 'Content-Type': 'application/json' },
  body: { taskIds: ['task-1', 'task-2'] },
});
```

### `createTestPPTX(options)`

Create a minimal PPTX file for testing.

```typescript
const pptx = await createTestPPTX({
  filename: 'test.pptx',
  slideCount: 1,
  title: 'Test Presentation',
});
```

### `createMultipartFormData(files)`

Create multipart/form-data for file uploads.

```typescript
const { body, contentType } = createMultipartFormData([
  { name: 'files', data: pptxBuffer, filename: 'test.pptx' },
]);
```

### `waitFor(condition, options)`

Wait for a condition to become true.

```typescript
await waitFor(
  async () => {
    const response = await getTaskStatus(taskId);
    return response.status === 'completed';
  },
  { timeout: 30000, interval: 1000 }
);
```

## Writing New Tests

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { httpRequest, createTestPPTX, createMultipartFormData } from '../helpers/test-helpers.js';

describe('My Feature', () => {
  it('should do something', async () => {
    // Arrange
    const pptx = await createTestPPTX({ filename: 'test.pptx' });
    const { body, contentType } = createMultipartFormData([
      { name: 'files', data: pptx, filename: 'test.pptx' },
    ]);

    // Act
    const response = await httpRequest('POST', `${TEST_URL}/api/v1/convert`, {
      headers: { 'Content-Type': contentType },
      body,
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## Troubleshooting

### Tests Fail with ECONNREFUSED

**Problem**: Cannot connect to test server

**Solution**: Make sure the server is running:
```bash
npm run dev
```

### Tests Timeout

**Problem**: Tests take too long to complete

**Solution**:
1. Check if server is responding
2. Increase test timeout:
```typescript
it('slow test', async () => { ... }, { timeout: 120000 });
```

### Fixture Files Not Found

**Problem**: Test PPTX files are missing

**Solution**: Generate fixtures:
```bash
npx tsx tests/fixtures/create-fixtures.ts
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Generate fixtures
        run: npx tsx tests/fixtures/create-fixtures.ts

      - name: Start server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run integration tests
        run: npm run test:integration
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Clean up test data after tests complete
3. **Timeouts**: Use appropriate timeouts for long-running operations
4. **Logging**: Use console.log for debugging during test development
5. **Assertions**: Use specific assertions (e.g., `expect(status).toBe(200)`)
6. **Error Messages**: Include helpful error messages in assertions

## Contributing

When adding new integration tests:

1. Create a new test file in `tests/integration/`
2. Follow the naming convention: `*.test.ts`
3. Use test helpers from `tests/helpers/test-helpers.ts`
4. Include clear descriptions for each test
5. Update this README with new test categories

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Fastify Documentation](https://fastify.dev/)
- [PPTist Project](https://github.com/pipipi-pikachu/PPTist)
