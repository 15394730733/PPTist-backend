/**
 * 深度调试元素解析
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { unzipPPTX } from '../../src/services/pptx/unzip';
import { parseSlideXML } from '../../src/services/pptx/parser';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: 元素解析', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');

  it('should parse elements from slide XML', async () => {
    console.log('\n🔍 测试元素解析...');

    const extracted = await unzipPPTX(pptxPath);

    // 获取第一张幻灯片
    const slide1Key = Array.from(extracted.slides.keys())[0];
    const slide1XML = extracted.slides.get(slide1Key);

    // 解析幻灯片
    const parsedSlide = parseSlideXML(slide1XML, 0, {
      extractMedia: false,
      includeNotes: true,
    });

    console.log(`\n解析结果:`);
    console.log(`  幻灯片 ID: ${parsedSlide.id}`);
    console.log(`  元素数量: ${parsedSlide.elements.length}`);
    console.log(`  有背景: ${!!parsedSlide.background}`);

    // 显示每个元素
    parsedSlide.elements.forEach((el, idx) => {
      console.log(`  元素 ${idx + 1}:`);
      console.log(`    类型: ${el.type}`);
      console.log(`    ID: ${el.id}`);
      console.log(`    位置: (${el.x}, ${el.y})`);
      if (el.content) console.log(`    内容: ${el.content}`);
    });

    // 如果没有元素，检查XML中的实际内容
    if (parsedSlide.elements.length === 0) {
      console.log('\n⚠️  没有提取到元素，检查原始 XML...');

      const { XMLParser } = await import('fast-xml-parser');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
      });

      const parsed = parser.parse(slide1XML);
      const spTree = parsed['p:sld']?.['p:cSld']?.['p:spTree'];

      if (spTree) {
        const sps = Array.isArray(spTree['p:sp']) ? spTree['p:sp'] : [spTree['p:sp']];
        console.log(`\n  找到 ${sps.length} 个 p:sp 元素:`);

        sps.forEach((sp: any, idx) => {
          console.log(`\n  p:sp #${idx + 1}:`);
          console.log(`    键: ${Object.keys(sp).filter(k => !k.startsWith('@')).join(', ')}`);

          // 检查是否有 txBody
          if (sp['p:txBody']) {
            console.log('    ✅ 有 p:txBody');
            const txBody = sp['p:txBody'];
            const ps = Array.isArray(txBody['a:p']) ? txBody['a:p'] : [txBody['a:p']];
            console.log(`      段落数: ${ps.length}`);
            ps.forEach((p: any, i: number) => {
              const text = p['a:r']?.[0]?.['#text'] || '';
              if (text) console.log(`      段落 ${i + 1}: "${text.substring(0, 50)}"`);
            });
          } else {
            console.log('    ❌ 没有 p:txBody');
          }
        });
      }
    }

    expect(parsedSlide.id).toBeDefined();
  });
});
