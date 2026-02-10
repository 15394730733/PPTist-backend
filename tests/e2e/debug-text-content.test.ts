/**
 * 调试文本内容提取
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { unzipPPTX } from '../../src/services/pptx/unzip';
import { parseSlideXML } from '../../src/services/pptx/parser';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: Text Content Extraction', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');

  it('should show text runs details', async () => {
    console.log('\n🔍 检查文本 run 详细内容...');

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
      console.log(`\n元素 ${idx + 1} (${el.shapeType}):`);
      if (el.textBox?.paragraphs) {
        el.textBox.paragraphs.forEach((p: any, pIdx: number) => {
          console.log(`  段落 ${pIdx + 1}:`);
          console.log(`    text: "${p.text}"`);
          console.log(`    runs: ${p.runs?.length || 0}`);

          if (p.runs) {
            p.runs.forEach((run: any, rIdx: number) => {
              console.log(`    Run ${rIdx + 1}:`);
              console.log(`      text: "${run.text}"`);
              console.log(`      font: ${run.font || 'N/A'}`);
              console.log(`      size: ${run.size || 'N/A'}`);
              console.log(`      bold: ${run.bold || false}`);
              console.log(`      italic: ${run.italic || false}`);
              console.log(`      完整对象:`, JSON.stringify(run, null, 2));
            });
          }
        });
      }
    });

    expect(true).toBe(true); // 总是通过，只用于调试输出
  });
});
