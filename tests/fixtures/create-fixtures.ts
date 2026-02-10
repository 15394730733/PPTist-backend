/**
 * Create Test Fixtures
 *
 * Generates test PPTX files for integration testing.
 *
 * @module tests/fixtures/create-fixtures
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { createTestPPTX } from '../helpers/test-helpers.js';

/**
 * Fixture info
 */
interface FixtureInfo {
  name: string;
  filename: string;
  description: string;
  size: number;
}

/**
 * Create all test fixtures
 */
export async function createAllFixtures(): Promise<void> {
  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'pptx');

  // 确保 fixtures 目录存在
  await fs.mkdir(fixturesDir, { recursive: true });

  console.log('Creating test fixtures...');
  const created: FixtureInfo[] = [];

  // 1. 简单的有效 PPTX
  const simplePPTX = await createTestPPTX({
    filename: 'valid-simple.pptx',
    slideCount: 1,
    title: 'Simple Test Presentation',
  });
  await saveFixture(fixturesDir, 'valid-simple.pptx', simplePPTX);
  created.push({
    name: 'Simple PPTX',
    filename: 'valid-simple.pptx',
    description: 'Simple single-slide PPTX for basic testing',
    size: simplePPTX.length,
  });

  // 2. 复杂的有效 PPTX（多幻灯片）
  const complexPPTX = await createTestPPTX({
    filename: 'valid-complex.pptx',
    slideCount: 5,
    title: 'Complex Test Presentation',
  });
  await saveFixture(fixturesDir, 'valid-complex.pptx', complexPPTX);
  created.push({
    name: 'Complex PPTX',
    filename: 'valid-complex.pptx',
    description: 'Multi-slide PPTX with various elements',
    size: complexPPTX.length,
  });

  // 3. 无效类型文件（DOCX）
  const invalidDocx = Buffer.from(
    'PK\x03\x04\x14\x00\x00\x00\x08\x00' + // ZIP header
    randomUUID() // Random content
  );
  await saveFixture(fixturesDir, 'invalid-type.docx', invalidDocx);
  created.push({
    name: 'Invalid Type (DOCX)',
    filename: 'invalid-type.docx',
    description: 'Word document to test file type validation',
    size: invalidDocx.length,
  });

  // 4. 小文件测试
  const smallPPTX = await createTestPPTX({
    filename: 'valid-small.pptx',
    slideCount: 1,
    title: 'Small',
  });
  await saveFixture(fixturesDir, 'valid-small.pptx', smallPPTX);
  created.push({
    name: 'Small PPTX',
    filename: 'valid-small.pptx',
    description: 'Very small PPTX for performance testing',
    size: smallPPTX.length,
  });

  console.log(`\n✅ Created ${created.length} test fixtures:\n`);
  created.forEach((fixture) => {
    console.log(`  - ${fixture.name}`);
    console.log(`    File: ${fixture.filename}`);
    console.log(`    Size: ${fixture.size} bytes`);
    console.log(`    Desc: ${fixture.description}`);
    console.log('');
  });
}

/**
 * Save fixture to disk
 */
async function saveFixture(
  dir: string,
  filename: string,
  data: Buffer
): Promise<void> {
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, data);
  console.log(`  Created: ${filepath}`);
}

/**
 * Main entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  createAllFixtures()
    .then(() => {
      console.log('\n✨ All fixtures created successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to create fixtures:', error);
      process.exit(1);
    });
}

export { createAllFixtures as default };
