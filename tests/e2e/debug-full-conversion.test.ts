/**
 * 调试完整转换流程
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { runConversion } from '../../src/services/conversion';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: Full Conversion', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');

  it('should show full conversion result', async () => {
    console.log('\n🔍 运行完整转换...');

    const result = await runConversion({
      taskId: 'debug-full',
      filename: 'simple.pptx',
      filePath: pptxPath,
      outputDir: join(__dirname, '../temp/debug'),
      skipValidation: true,
      onProgress: (progress, message) => {
        console.log(`  [${progress}%] ${message}`);
      },
    });

    console.log('\n转换结果:');
    console.log(`  success: ${result.success}`);
    console.log(`  has error: ${!!result.error}`);
    if (result.error) {
      console.log(`  error message: ${result.error}`);
    }
    console.log(`  has data: ${!!result.data}`);
    console.log(`  has metadata: ${!!result.metadata}`);

    if (result.data) {
      console.log('\nresult.data 结构:');
      console.log(`  version: ${result.data.version}`);
      console.log(`  has presentation: ${!!result.data.presentation}`);
      if (result.data.presentation) {
        console.log(`  presentation.slides: ${result.data.presentation.slides?.length}`);
      }
    }

    if (result.metadata) {
      console.log('\nmetadata 结构:');
      console.log(`  sourceFilename: "${result.metadata.sourceFilename}"`);
      console.log(`  slideCount: ${result.metadata.slideCount}`);
      console.log(`  totalElements: ${result.metadata.totalElements}`);
      console.log(`  processingTimeMs: ${result.metadata.processingTimeMs}`);
    }

    expect(true).toBe(true); // 总是通过，只用于调试输出
  });
});
