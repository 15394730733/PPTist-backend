/**
 * 调试原始段落对象
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { unzipPPTX } from '../../src/services/pptx/unzip';
import { XMLParser } from 'fast-xml-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: Raw Paragraph Object', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');

  it('should show raw paragraph structure from XML', async () => {
    console.log('\n🔍 检查原始 XML 段落结构...');

    const extracted = await unzipPPTX(pptxPath);

    // 获取第一张幻灯片
    const slide1Key = Array.from(extracted.slides.keys())[0];
    const slide1XML = extracted.slides.get(slide1Key);

    // 使用 fast-xml-parser 解析
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
    });

    const parsed = parser.parse(slide1XML);
    const spTree = parsed['p:sld']?.['p:cSld']?.['p:spTree'];

    if (spTree && spTree['p:sp']) {
      const shapes = Array.isArray(spTree['p:sp']) ? spTree['p:sp'] : [spTree['p:sp']];

      shapes.forEach((sp: any, idx: number) => {
        console.log(`\nShape ${idx + 1}:`);
        const txBody = sp['p:txBody'];
        if (txBody && txBody['a:p']) {
          const paragraphs = Array.isArray(txBody['a:p']) ? txBody['a:p'] : [txBody['a:p']];
          paragraphs.forEach((p: any, pIdx: number) => {
            console.log(`  段落 ${pIdx + 1}:`);
            console.log(`    键: ${Object.keys(p).join(', ')}`);
            if (p['a:r']) {
              const runs = Array.isArray(p['a:r']) ? p['a:r'] : [p['a:r']];
              runs.forEach((r: any, rIdx: number) => {
                console.log(`    Run ${rIdx + 1}:`);
                console.log(`      键: ${Object.keys(r).join(', ')}`);
                console.log(`      a:t 存在: ${!!r['a:t']}`);
                if (r['a:t']) {
                  console.log(`      a:t 类型: ${typeof r['a:t']}`);
                  console.log(`      a.t 值: ${JSON.stringify(r['a:t'])}`);
                }
              });
            }
          });
        }
      });
    }

    expect(true).toBe(true); // 总是通过，只用于调试输出
  });
});
