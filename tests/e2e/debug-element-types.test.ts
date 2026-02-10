/**
 * 调试元素类型和幻灯片结构
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { runConversion } from '../../src/services/conversion';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Debug: Element Types and Structure', () => {
  const pptxPath = join(__dirname, '../fixtures/simple.pptx');

  it('should show element types and slide structure', async () => {
    console.log('\n🔍 检查元素类型和结构...');

    const result = await runConversion({
      taskId: 'debug-element-types',
      filename: 'simple.pptx',
      filePath: pptxPath,
      outputDir: join(__dirname, '../temp/debug'),
      skipValidation: true,
    });

    if (!result.success || !result.data?.presentation) {
      console.error('转换失败:', result.error);
      return;
    }

    const presentation = result.data.presentation;

    console.log('\n📊 Presentation 结构:');
    console.log(`  width: ${presentation.width}`);
    console.log(`  height: ${presentation.height}`);
    console.log(`  slides: ${presentation.slides.length}`);

    presentation.slides.forEach((slide: any, idx: number) => {
      console.log(`\n幻灯片 ${idx + 1}:`);
      console.log(`  id: ${slide.id}`);
      console.log(`  width: ${slide.width}`);
      console.log(`  height: ${slide.height}`);
      console.log(`  elements: ${slide.elements?.length}`);

      slide.elements?.forEach((el: any, elIdx: number) => {
        console.log(`    元素 ${elIdx + 1}:`);
        console.log(`      type: ${el.type}`);
        console.log(`      id: ${el.id}`);
        if (el.textBox) {
          console.log(`      有 textBox: 是`);
          console.log(`      段落数: ${el.textBox.paragraphs?.length || 0}`);
          el.textBox.paragraphs?.forEach((p: any, pIdx: number) => {
            if (p.text) {
              console.log(`        段落 ${pIdx + 1}: "${p.text.substring(0, 50)}"`);
            }
          });
        } else {
          console.log(`      有 textBox: 否`);
        }
      });
    });

    expect(true).toBe(true); // 总是通过，只用于调试输出
  });
});
