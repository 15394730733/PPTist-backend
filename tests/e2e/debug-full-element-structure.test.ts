/**
 * 调试元素完整结构
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { unzipPPTX } from '../../src/services/pptx/unzip';
import { parseSlideXML } from '../../src/services/pptx/parser';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: Full Element Structure', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');

  it('should show full element structure from parser', async () => {
    console.log('\n🔍 检查解析后的元素完整结构...');

    const extracted = await unzipPPTX(pptxPath);

    // 获取第一张幻灯片
    const slide1Key = Array.from(extracted.slides.keys())[0];
    const slide1XML = extracted.slides.get(slide1Key);

    // 解析幻灯片
    const parsedSlide = parseSlideXML(slide1XML, 0, {
      extractMedia: false,
      includeNotes: true,
    });

    console.log(`\n解析结果: ${parsedSlide.elements.length} 个元素`);

    parsedSlide.elements.forEach((el, idx) => {
      console.log(`\n元素 ${idx + 1}:`);
      console.log(`  type: ${el.type}`);
      console.log(`  id: ${el.id}`);
      console.log(`  shapeType: ${el.shapeType}`);
      console.log(`  position:`, el.position);
      console.log(`  size:`, el.size);
      console.log(`  fill:`, el.fill);
      console.log(`  stroke:`, el.stroke);
      console.log(`  textBox:`, el.textBox ? 'YES' : 'NO');
      if (el.textBox) {
        console.log(`    paragraphs: ${el.textBox.paragraphs?.length || 0}`);
        el.textBox.paragraphs?.forEach((p: any, i: number) => {
          console.log(`      段落 ${i + 1}:`);
          console.log(`        text: "${p.text}"`);
          console.log(`        alignment: ${p.alignment}`);
          console.log(`        runs: ${p.runs?.length || 0}`);
        });
      }
    });

    expect(true).toBe(true); // 总是通过，只用于调试输出
  });
});
