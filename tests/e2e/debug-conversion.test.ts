/**
 * 调试转换流程
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { unzipPPTX } from '../../src/services/pptx/unzip';
import { ConversionOrchestrator } from '../../src/services/conversion/orchestrator';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: PPTX 解析和转换', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');
  const outputDir = join(__dirname, '../temp/debug');

  beforeAll(async () => {
    await fs.mkdir(outputDir, { recursive: true });
  });

  it('should unzip PPTX file', async () => {
    console.log('\n📦 测试 PPTX 解压...');
    const extracted = await unzipPPTX(pptxPath);

    console.log(`✅ 解压成功`);
    console.log(`   幻灯片数: ${extracted.slides.size}`);
    console.log(`   媒体数: ${extracted.media.size}`);
    console.log(`   主题数: ${extracted.themes.size}`);

    expect(extracted.slides.size).toBeGreaterThan(0);
  });

  it('should parse and convert slides', async () => {
    console.log('\n🔄 测试转换流程...');

    // 步骤 1: 解压
    const extracted = await unzipPPTX(pptxPath);
    console.log(`   [1/2] 解压完成 - ${extracted.slides.size} 张幻灯片`);

    // 步骤 2: 转换
    const orchestrator = new ConversionOrchestrator({
      includeAnimations: true,
      includeNotes: true,
      preserveZIndex: true,
      processGroups: true,
      targetVersion: 'latest',
    });

    const context = {
      version: 'latest',
      basePath: '',
      mediaFiles: new Map(),
      resolveMediaReference: (ref: string) => null,
      slideSize: {
        width: 1280,
        height: 720,
      },
      elementIdMap: new Map(),
      warnings: [],
      metadata: {
        slideNumber: 1,
        sourceFilename: 'simple.pptx',
      },
    };

    try {
      const presentation = orchestrator.convert(extracted, context as any);
      console.log(`   [2/2] 转换完成`);
      console.log(`   幻灯片数: ${presentation.slides.length}`);

      // 显示每张幻灯片的元素
      presentation.slides.forEach((slide, index) => {
        console.log(`   幻灯片 ${index + 1}: ${slide.elements?.length || 0} 个元素`);
        slide.elements?.slice(0, 3).forEach((el: any) => {
          console.log(`     - ${el.type}: ${el.id}`);
        });
      });

      expect(presentation.slides.length).toBeGreaterThan(0);
    } catch (error) {
      console.error(`❌ 转换失败:`, error);
      throw error;
    }
  });

  it('should serialize result', async () => {
    console.log('\n📝 测试序列化...');

    const extracted = await unzipPPTX(pptxPath);
    const orchestrator = new ConversionOrchestrator({
      includeAnimations: true,
      includeNotes: true,
      preserveZIndex: true,
      processGroups: true,
      targetVersion: 'latest',
    });

    const context = {
      version: 'latest',
      basePath: '',
      mediaFiles: new Map(),
      resolveMediaReference: (ref: string) => null,
      slideSize: {
        width: 1280,
        height: 720,
      },
      elementIdMap: new Map(),
      warnings: [],
      metadata: {
        slideNumber: 1,
        sourceFilename: 'simple.pptx',
      },
    };

    const presentation = orchestrator.convert(extracted, context as any);

    console.log(`   转换完成，开始序列化...`);

    try {
      const { serializeResult } = await import('../../src/services/conversion/serializer');
      const metadata = {
        slideCount: presentation.slides.length,
        fileSize: 28770,
        processingTimeMs: 100,
        sourceFilename: 'simple.pptx',
        elementCounts: {
          text: 0,
          image: 0,
          shape: 0,
          chart: 0,
          table: 0,
          line: 0,
          group: 0,
          unknown: 0,
        },
        totalElements: presentation.slides.reduce((sum, s) => sum + (s.elements?.length || 0), 0),
      };

      const result = serializeResult(presentation as any, metadata as any, []);

      console.log(`✅ 序列化成功`);
      console.log(`   版本: ${result.version}`);
      console.log(`   包含 presentation: ${!!result.presentation}`);
      console.log(`   包含 metadata: ${!!result.metadata}`);

      expect(result.presentation).toBeDefined();
    } catch (error) {
      console.error(`❌ 序列化失败:`, error);
      throw error;
    }
  });
});
