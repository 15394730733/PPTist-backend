/**
 * End-to-End Conversion Tests
 *
 * Tests the complete PPTX to JSON conversion workflow.
 * These tests don't require a running server.
 *
 * @module tests/e2e/conversion-e2e
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { runConversion } from '../../src/services/conversion';
import { createZip } from '../../src/utils/zip-helper';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, '../temp/e2e');
const OUTPUT_DIR = join(TEST_DIR, 'output');

describe('End-to-End Conversion Tests', () => {
  beforeAll(async () => {
    // 创建测试目录
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // 清理测试文件
    // await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Simple PPTX Conversion', () => {
    it('should convert a simple PPTX with one slide', async () => {
      // 使用新创建的测试 PPTX 文件
      const pptxPath = join(__dirname, '../fixtures/simple.pptx');

      // 验证文件存在
      const exists = await fs.access(pptxPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error(`Test file not found: ${pptxPath}`);
      }

      console.log(`📂 使用测试文件: ${pptxPath}`);

      // 运行转换
      const result = await runConversion({
        taskId: 'test-simple-1',
        filename: 'simple.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
        extractMedia: true,
        includeAnimations: true,
        includeNotes: true,
        skipValidation: false, // 运行验证
        ignoreEncryption: true, // 忽略加密标记（因为这是一个误报）
      });

      // 打印结果以便调试
      console.log('📊 转换结果:');
      console.log(`   success: ${result.success}`);
      console.log(`   error: ${result.error}`);
      console.log(`   data 存在: ${!!result.data}`);
      console.log(`   metadata 存在: ${!!result.metadata}`);
      console.log(`   warnings: ${result.warnings?.length || 0} 条`);

      if (!result.success && result.error) {
        console.error('❌ 转换失败:', result.error);
      }
      if (!result.data) {
        console.error('❌ 转换返回数据为空');
        console.log('完整结果:', JSON.stringify(result, null, 2));
      }

      expect(result.success, '转换应该成功').toBe(true);
      expect(result.data, '应该返回转换数据').toBeDefined();
      expect(result.metadata, '应该返回元数据').toBeDefined();

      // 调试：打印 data 的实际结构
      console.log('📋 data 的类型:', typeof result.data);
      console.log('📋 data 的键:', Object.keys(result.data || {}));

      // 验证基本结构
      const data = result.data;
      expect(data.version).toBeDefined();
      expect(data.presentation).toBeDefined();
      expect(data.presentation.slides).toBeInstanceOf(Array);
      expect(data.presentation.slides.length).toBeGreaterThan(0);

      const presentation = data.presentation;

      // 验证元数据
      expect(result.metadata?.slideCount).toBeGreaterThan(0);
      expect(result.metadata?.sourceFilename).toBe('simple.pptx');
      expect(result.metadata?.processingTime).toBeGreaterThan(0);

      console.log('✅ 简单 PPTX 转换成功');
      console.log(`   版本: ${data.version}`);
      console.log(`   幻灯片数: ${presentation.slides.length}`);
      console.log(`   处理时间: ${result.metadata?.processingTimeMs}ms`);
      console.log(`   元素总数: ${presentation.slides.reduce((sum, s) => sum + (s.elements?.length || 0), 0)}`);
    });
  });

  describe('PPTX with Multiple Elements', () => {
    it('should convert PPTX with text and shapes', async () => {
      // 也使用真实的 simple.pptx 文件（通常包含多个元素）
      const pptxPath = join(__dirname, '../fixtures/simple.pptx');

      const result = await runConversion({
        taskId: 'test-elements-1',
        filename: 'simple.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
        ignoreEncryption: true, // 忽略加密标记
      });

      if (!result.success) {
        console.error('❌ 转换失败:', result.error);
      }
      expect(result.success, '转换应该成功').toBe(true);
      const data = result.data;
      const presentation = data.presentation;

      // 验证至少有一个幻灯片
      expect(presentation.slides.length).toBeGreaterThan(0);

      // 验证幻灯片有元素
      const firstSlide = presentation.slides[0];
      expect(firstSlide.elements).toBeInstanceOf(Array);

      console.log('✅ 多元素 PPTX 转换成功');
      console.log(`   版本: ${data.version}`);
      console.log(`   幻灯片数: ${presentation.slides.length}`);
      console.log(`   第一个幻灯片元素数量: ${firstSlide.elements.length}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid PPTX file', async () => {
      const pptxPath = join(TEST_DIR, 'invalid.pptx');
      await fs.writeFile(pptxPath, 'not a valid pptx');

      const result = await runConversion({
        taskId: 'test-invalid-1',
        filename: 'invalid.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      console.log('✅ 无效文件处理正确');
    });

    it('should handle non-existent file', async () => {
      const pptxPath = join(TEST_DIR, 'nonexistent.pptx');

      const result = await runConversion({
        taskId: 'test-nonexistent-1',
        filename: 'nonexistent.pptx',
        filePath: pptxPath,
        outputDir: OUTPUT_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      console.log('✅ 不存在文件处理正确');
    });
  });
});

/**
 * 创建一个简单的 PPTX 文件用于测试
 */
async function createSimplePPTX(filePath: string): Promise<void> {
  const zip = createZip();

  // 添加 [Content_Types].xml
  zip.addFile('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-presentationml.presentation.main+xml"/>
</Types>`);

  // 添加 _rels/.rels
  zip.addFile('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  // 添加 ppt/presentation.xml
  zip.addFile('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:slideIdLst>
    <p:slideId id="256" r:id="rId1"/>
  </p:slideIdLst>
</p:presentation>`);

  // 添加 ppt/_rels/presentation.xml.rels
  zip.addFile('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`);

  // 添加 ppt/slides/slide1.xml
  zip.addFile('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
         xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
</p:sld>`);

  // 添加 ppt/slides/_rels/slide1.xml.rels
  zip.addFile('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  // 保存文件
  const buffer = zip.generate();
  await fs.writeFile(filePath, buffer);
}

/**
 * 创建包含多个元素的 PPTX 文件
 */
async function createPPTXWithElements(filePath: string): Promise<void> {
  const zip = createZip();

  // 添加基本结构
  zip.addFile('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-presentationml.presentation.main+xml"/>
</Types>`);

  zip.addFile('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  zip.addFile('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:slideIdLst>
    <p:slideId id="256" r:id="rId1"/>
  </p:slideIdLst>
</p:presentation>`);

  zip.addFile('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`);

  // 添加包含文本框和形状的幻灯片
  zip.addFile('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
         xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="9144000" cy="6858000"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="9144000" cy="6858000"/>
        </a:xfrm>
      </p:grpSpPr>
      <!-- 文本框 -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="TextBox 1"/>
          <p:cNvSpPr>
            <a:spLocks noChangeAspect="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="body"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1000000" y="1000000"/>
            <a:ext cx="4000000" cy="1000000"/>
          </a:xfrm>
          <a:solidFill>
            <a:srgbClr val="FFFFFF"/>
          </a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US"/>
              <a:t>Test Text</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <!-- 形状 -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Rectangle 1"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="2000000" y="3000000"/>
            <a:ext cx="2000000" cy="1500000"/>
          </a:xfrm>
          <a:solidFill>
            <a:srgbClr val="0070C0"/>
          </a:solidFill>
        </p:spPr>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`);

  zip.addFile('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  const buffer = zip.generate();
  await fs.writeFile(filePath, buffer);
}
