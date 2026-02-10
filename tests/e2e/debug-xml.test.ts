/**
 * 调试 PPTX XML 结构
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { unzipPPTX } from '../../src/services/pptx/unzip';
import { XMLParser } from 'fast-xml-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: PPTX XML Structure', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');

  it('should display slide XML structure', async () => {
    console.log('\n🔍 检查 PPTX XML 结构...');

    const extracted = await unzipPPTX(pptxPath);

    // 获取第一张幻灯片的 XML
    const slide1Key = Array.from(extracted.slides.keys())[0];
    const slide1XML = extracted.slides.get(slide1Key);

    console.log(`\n幻灯片1文件: ${slide1Key}`);
    console.log(`XML 长度: ${slide1XML.length} 字符`);

    // 解析 XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      cdataPropName: '#cdata',
      commentPropName: '#comment',
    });

    const parsed = parser.parse(slide1XML);

    console.log('\n解析后的 XML 结构（前500字符）:');
    console.log(JSON.stringify(parsed, null, 2).substring(0, 500));

    // 查找关键路径
    console.log('\n检查关键路径:');
    console.log('  p:sld:', parsed['p:sld'] ? '存在' : '不存在');
    console.log('  p:cSld:', parsed['p:sld']?.['p:cSld'] ? '存在' : '不存在');
    console.log('  p:spTree:', parsed['p:sld']?.['p:cSld']?.['p:spTree'] ? '存在' : '不存在');

    if (parsed['p:sld']?.['p:cSld']?.['p:spTree']) {
      const spTree = parsed['p:sld']['p:cSld']['p:spTree'];
      console.log('\n spTree 的直接子标签:');
      console.log('  子标签:', Object.keys(spTree).filter(k => k.startsWith('p:')));

      console.log('\n  p:sp 数组:');
      const sps = Array.isArray(spTree['p:sp']) ? spTree['p:sp'] : [spTree['p:sp']];
      console.log(`    数量: ${sps.length}`);
      if (sps.length > 0 && sps[0]) {
        console.log(`    第一个 p:sp 的键: ${Object.keys(sps[0]).slice(0, 10).join(', ')}`);
      }
    }

    expect(slide1XML).toBeTruthy();
  });
});
