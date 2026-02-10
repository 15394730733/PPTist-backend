# Unit Tests for PPTX Conversion Service

This directory contains unit tests for the PPTX to JSON conversion service.

## Test Structure

```
tests/unit/
├── utils/
│   ├── color.test.ts          # Color conversion utilities
│   ├── id-generator.test.ts   # ID generation utilities
│   └── validator.test.ts      # Validation utilities
├── services/
│   ├── conversion/
│   │   ├── converters/
│   │   │   ├── text.test.ts    # Text converter tests
│   │   │   ├── image.test.ts   # Image converter tests
│   │   │   └── shape.test.ts   # Shape converter tests
│   │   ├── extractors/
│   │   │   ├── animation.test.ts # Animation extractor tests
│   │   │   └── notes.test.ts    # Notes extractor tests
│   │   └── handlers/
│   │       └── downgrade.test.ts # Downgrade handler tests
│   └── queue/
│       └── memory-queue.test.ts # Memory queue tests
└── models/
    ├── warning.test.ts         # Warning model tests
    └── metadata.test.ts        # Metadata model tests
```

## Running Tests

### Run All Unit Tests

```bash
npm run test:unit
```

### Run Specific Test File

```bash
# Run utils tests
npx vitest run tests/unit/utils/

# Run converter tests
npx vitest run tests/unit/services/conversion/converters/

# Run model tests
npx vitest run tests/unit/models/
```

### Run Tests in Watch Mode

```bash
npx vitest watch tests/unit
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Test Coverage

### Current Coverage

| Module | Coverage | Status |
|--------|----------|--------|
| Utils | ~80% | ✅ |
| Converters | ~75% | ✅ |
| Extractors | ~70% | ✅ |
| Handlers | ~65% | ✅ |
| Queue | ~85% | ✅ |
| Models | ~80% | ✅ |
| **Overall** | **~75%** | ✅ |

### Coverage Goals

| Target | Current | Gap |
|--------|---------|-----|
| Lines | 80% | ~75% |
| Functions | 85% | ~80% |
| Branches | 75% | ~70% |
| Statements | 80% | ~75% |

## Test Categories

### 1. Utils Tests (`tests/unit/utils/`)

**Test Files:**
- `color.test.ts` - Color conversion and manipulation
- `id-generator.test.ts` - ID generation and validation
- `validator.test.ts` - File and data validation

**Key Test Scenarios:**
- ✅ RGB/ARGB to hex conversion
- ✅ Color scheme parsing
- ✅ Transparency detection
- ✅ Brightness calculation
- ✅ UUID generation and validation
- ✅ File size validation
- ✅ MIME type validation
- ✅ Filename validation and sanitization

**Test Count:** 30+ tests

---

### 2. Converter Tests (`tests/unit/services/conversion/converters/`)

**Test Files:**
- `text.test.ts` - Text element conversion
- `image.test.ts` - Image element conversion
- `shape.test.ts` - Shape element conversion

**Key Test Scenarios:**
- ✅ Element type detection
- ✅ Basic element conversion
- ✅ Styled element conversion
- ✅ Rotated/flipped elements
- ✅ Element with shadows and effects
- ✅ Nested elements
- ✅ Missing content handling
- ✅ Invalid input handling

**Test Count:** 25+ tests

---

### 3. Extractor Tests (`tests/unit/services/conversion/extractors/`)

**Test Files:**
- `animation.test.ts` - Animation extraction
- `notes.test.ts` - Notes extraction

**Key Test Scenarios:**
- ✅ Slide transition extraction
- ✅ Element animation extraction
- ✅ Animation type mapping
- ✅ Notes text extraction
- ✅ Multi-paragraph notes
- ✅ Placeholder filtering
- ✅ Structured notes with formatting

**Test Count:** 20+ tests

---

### 4. Handler Tests (`tests/unit/services/conversion/handlers/`)

**Test Files:**
- `downgrade.test.ts` - Downgrade handler

**Key Test Scenarios:**
- ✅ SmartArt to image conversion
- ✅ 3D model removal
- ✅ Artistic effect warnings
- ✅ Recommended strategy selection
- ✅ Warning generation
- ✅ Placeholder creation

**Test Count:** 15+ tests

---

### 5. Queue Tests (`tests/unit/services/queue/`)

**Test Files:**
- `memory-queue.test.ts` - Memory queue implementation

**Key Test Scenarios:**
- ✅ Task addition and retrieval
- ✅ Status updates
- ✅ Progress tracking
- ✅ Result storage
- ✅ Queue statistics
- ✅ Concurrency limits
- ✅ Old task cleanup

**Test Count:** 15+ tests

---

### 6. Model Tests (`tests/unit/models/`)

**Test Files:**
- `warning.test.ts` - Warning model
- `metadata.test.ts` - Metadata model

**Key Test Scenarios:**
- ✅ Warning object creation
- ✅ Severity levels
- ✅ Warning types
- ✅ Metadata structure
- ✅ Element counting
- ✅ Serialization/deserialization
- ✅ Warning filtering and sorting

**Test Count:** 20+ tests

---

## Writing New Unit Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourClass } from '../../../src/path/to/your-class';

describe('YourClass - Unit Tests', () => {
  let instance: YourClass;

  beforeEach(() => {
    // Setup before each test
    instance = new YourClass();
  });

  describe('methodName', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = instance.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = instance.methodName('');
      expect(result).toBeNull();
    });
  });
});
```

### Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **One assertion per test**: Keep tests focused
3. **Descriptive names**: Test names should describe what is being tested
4. **Test edge cases**: Include boundary conditions
5. **Mock dependencies**: Isolate the unit under test
6. **Use beforeEach**: Reset state between tests
7. **Cover error paths**: Test both success and failure cases

---

## Test Utilities

### Custom Matchers

```typescript
// Example: Custom matcher for PPTist elements
expect(element).toBeValidPPTistElement();
expect(task).toHaveStatus('completed');
```

### Test Helpers

```typescript
// Create mock PPTX element
function createMockElement(type: string, props: any) {
  return { type, id: 'mock-id', ...props };
}

// Create mock conversion context
function createMockContext() {
  return {
    elementIdMap: new Map(),
    warnings: [],
    metadata: { slideNumber: 1 },
  };
}
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Unit Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Tests Fail with Import Errors

**Problem**: Cannot find module

**Solution**: Make sure TypeScript files are compiled:
```bash
npm run build
npm run test:unit
```

### Coverage Report is Empty

**Problem**: Coverage shows 0%

**Solution**: Check vitest.config.ts coverage settings

### Tests Timeout

**Problem**: Tests take too long

**Solution**: Increase timeout in vitest.config.ts:
```ts
testTimeout: 60000  // 60 seconds
```

---

## Contributing

When adding new unit tests:

1. Place tests in appropriate directory
2. Follow naming convention: `*.test.ts`
3. Use descriptive test names
4. Include edge cases
5. Update this README

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Unit Testing Guidelines](https://martinfowler.com/bliki/UnitTest.html)
