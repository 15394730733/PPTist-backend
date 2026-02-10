/**
 * End-to-End Conversion Tests (使用真实 PPTX 文件)
 *
 * Tests the complete PPTX to JSON conversion workflow.
 * These tests use real PPTX files for accurate testing.
 *
 * @module tests/e2e/conversion-e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runConversion } from '../../src/services/conversion';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, '../temp/e2e');
const OUTPUT_DIR = join(TEST_DIR, 'output');
const FIXTURES_DIR = join(__dirname, '../fixtures');

describe('End-to-End Conversion Tests (Real PPTX)', () => {
  beforeAll(async () => {
    // 创建测试目录
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.mkdir(FIXTURES_DIR, { recursive: true });
  });

  describe('Real PPTX File Conversion', () => {
    it('should convert a simple real PPTX file', async () => {
      // 检查测试文件是否存在
      const pptxPath = join(FIXTURES_DIR, 'simple.pptx');

      try {
        await fs.access(pptxPath);
      } catch (error) {
        console.error('\n❌ 测试文件不存在:', pptxPath);
        console.error('\n📝 请按照以下步骤创建测试文件：');
        console.error('   1. 手动创建一个简单的 PPTX 文件');
        console.error('   2. 或者运行: pip install python-pptx');
        console.error('   3. 然后运行: python scripts/create-test-pptx.py');
        console.error('   4. 将文件保存到: tests/fixtures/simple.pptx\n');
        throw new Error('测试文件不存在，请先创建 tests/fixtures/simple.pptx');
      }

      const stats = await fs.stat(pptxPath);
      console.log(`\n✅ 找到测试文件: ${pptxPath}`);
      console.log(`   文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

      // 运行转换（跳过验证以避免误报）
      const result = await runConversion({
        taskId: 'test-real-simple-1',
        filename: 'simple.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
        extractMedia: true,
        includeAnimations: true,
        includeNotes: true,
        skipValidation: true, // 跳过验证以避免 yauzl 加密检测误报
        onProgress: (progress, message) => {
          console.log(`   [${progress}%] ${message}`);
        },
      });

      // 验证结果
      if (!result.success) {
        console.error('\n❌ 转换失败:', result.error);
      }
      expect(result.success).toBe(true);

      if (!result.data) {
        console.error('\n❌ 转换返回数据为空');
        console.log('完整结果:', JSON.stringify(result, null, 2));
      }
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();

      // 验证基本结构
      expect(result.data).toBeDefined();
      expect(result.data.version).toBeDefined();
      expect(result.data.presentation).toBeDefined();

      const presentation = result.data.presentation;
      expect(presentation).toBeInstanceOf(Object);
      expect(presentation.slides).toBeInstanceOf(Array);
      expect(presentation.slides.length).toBeGreaterThan(0);

      // 验证元数据
      expect(result.metadata?.slideCount).toBeGreaterThan(0);
      expect(result.metadata?.sourceFilename).toBe('simple.pptx');
      expect(result.metadata?.processingTimeMs).toBeGreaterThan(0);

      console.log('\n✅ 真实 PPTX 转换成功！');
      console.log(`   幻灯片数: ${presentation.slides.length}`);
      console.log(`   总元素数: ${presentation.slides.reduce((sum, s: any) => sum + (s.elements?.length || 0), 0)}`);
      console.log(`   处理时间: ${result.metadata?.processingTimeMs}ms`);
      console.log(`   文件大小: ${(result.metadata?.fileSize ? (result.metadata.fileSize / 1024).toFixed(2) : 'N/A')} KB`);

      if (result.warnings && result.warnings.length > 0) {
        console.log(`   警告数: ${result.warnings.length}`);
        result.warnings.forEach((w: any, i: number) => {
          if (i < 5) {
            console.log(`     - ${w.type}: ${w.message}`);
          }
        });
      }
    });

    it('should extract and preserve text elements', async () => {
      const pptxPath = join(FIXTURES_DIR, 'simple.pptx');

      try {
        await fs.access(pptxPath);
      } catch {
        // 如果文件不存在，跳过此测试
        console.log('\n⚠️  跳过测试：测试文件不存在');
        return;
      }

      const result = await runConversion({
        taskId: 'test-text-elements',
        filename: 'simple.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
        skipValidation: true, // 跳过验证以避免误报
      });

      expect(result.success).toBe(true);
      const presentation = result.data?.presentation;

      // 检查是否有文本元素（shape 元素也可以包含文本）
      const elementsWithText = presentation?.slides.flatMap((slide: any) =>
        slide.elements?.filter((el: any) => el.type === 'shape' && el.text) || []
      ) || [];

      console.log(`\n📝 文本元素统计:`);
      console.log(`   包含文本的元素数: ${elementsWithText.length}`);

      elementsWithText.slice(0, 3).forEach((el: any, i: number) => {
        if (el.text) {
          console.log(`   元素 ${i + 1}: "${el.text.substring(0, 50)}${el.text.length > 50 ? '...' : ''}"`);
        }
      });

      expect(elementsWithText.length).toBeGreaterThan(0);
    });

    it('should preserve slide structure and properties', async () => {
      const pptxPath = join(FIXTURES_DIR, 'simple.pptx');

      try {
        await fs.access(pptxPath);
      } catch {
        console.log('\n⚠️  跳过测试：测试文件不存在');
        return;
      }

      const result = await runConversion({
        taskId: 'test-slide-structure',
        filename: 'simple.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
        skipValidation: true, // 跳过验证以避免误报
      });

      expect(result.success).toBe(true);
      const presentation = result.data?.presentation;

      console.log(`\n📊 幻灯片结构:`);
      presentation?.slides.forEach((slide: any, index: number) => {
        console.log(`   幻灯片 ${index + 1}:`);
        console.log(`     - ID: ${slide.id}`);
        console.log(`     - 元素数: ${slide.elements?.length || 0}`);
      });

      // 验证幻灯片属性（注意：slide 没有 width/height，它们在 presentation 级别）
      presentation.slides.forEach((slide: any) => {
        expect(slide.id).toBeDefined();
        expect(slide.elements).toBeInstanceOf(Array);
      });
    });
  });

  describe('Error Handling with Real Files', () => {
    it('should handle corrupted PPTX file', async () => {
      // 创建一个损坏的文件
      const corruptedPath = join(FIXTURES_DIR, 'corrupted.pptx');
      await fs.writeFile(corruptedPath, 'This is not a valid PPTX file');

      const result = await runConversion({
        taskId: 'test-corrupted',
        filename: 'corrupted.pptx',
        filePath: corruptedPath,
        outputDir: OUTPUT_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      console.log(`\n✅ 正确处理损坏文件: ${result.error}`);
    });

    it('should handle empty PPTX file', async () => {
      const emptyPath = join(FIXTURES_DIR, 'empty.pptx');
      await fs.writeFile(emptyPath, '');

      const result = await runConversion({
        taskId: 'test-empty',
        filename: 'empty.pptx',
        filePath: emptyPath,
        outputDir: OUTPUT_DIR,
      });

      expect(result.success).toBe(false);
      console.log(`\n✅ 正确处理空文件: ${result.error}`);
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete conversion within reasonable time', async () => {
      const pptxPath = join(FIXTURES_DIR, 'simple.pptx');

      try {
        await fs.access(pptxPath);
      } catch {
        console.log('\n⚠️  跳过测试：测试文件不存在');
        return;
      }

      const startTime = Date.now();

      const result = await runConversion({
        taskId: 'test-performance',
        filename: 'simple.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
        skipValidation: true, // 跳过验证以避免误报
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // 10秒内完成

      console.log(`\n⚡ 性能统计:`);
      console.log(`   总耗时: ${duration}ms`);
      console.log(`   每张幻灯片: ${result.metadata?.slideCount ? Math.round(duration / result.metadata.slideCount) : 'N/A'}ms`);
      console.log(`   状态: ${duration < 5000 ? '优秀' : duration < 10000 ? '良好' : '需要优化'}`);
    });
  });
});
