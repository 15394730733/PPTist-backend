/**
 * Debug script to check PPTX file encryption status
 */

import yauzl from 'yauzl';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pptxPath = join(__dirname, '../tests/fixtures/simple.pptx');

console.log('📂 检查文件:', pptxPath);

yauzl.open(
  pptxPath,
  {
    strictFileNames: false,
    lazyEntries: true,
  },
  (err, zipfile) => {
    if (err) {
      console.error('❌ 打开 ZIP 失败:', err.message);
      process.exit(1);
    }

    if (!zipfile) {
      console.error('❌ ZIP 文件句柄为空');
      process.exit(1);
    }

    console.log('✅ ZIP 文件打开成功');
    console.log('📋 ZIP 条目列表:\n');

    let entryCount = 0;
    let hasEncrypted = false;

    zipfile.on('entry', (entry) => {
      entryCount++;
      const isEncrypted = entry.isEncrypted ? '🔒 是' : '否';
      const isCompressed = entry.compressionMethod ? `压缩方法: ${entry.compressionMethod}` : '';

      if (entry.isEncrypted) {
        hasEncrypted = true;
      }

      console.log(`  ${entryCount}. ${entry.fileName}`);
      console.log(`     - 加密: ${isEncrypted}`);
      if (isCompressed) {
        console.log(`     - ${isCompressed}`);
      }
      console.log(`     - 大小: ${entry.uncompressedSize} bytes\n`);

      zipfile.readEntry();
    });

    zipfile.on('end', () => {
      console.log(`\n📊 统计:`);
      console.log(`  总条目数: ${entryCount}`);
      console.log(`  加密条目: ${hasEncrypted ? '是 🔒' : '否 ✅'}`);

      if (hasEncrypted) {
        console.log('\n⚠️  警告: 文件包含加密条目，这可能导致转换失败');
      }

      zipfile.close();
      process.exit(0);
    });

    zipfile.on('error', (err) => {
      console.error('❌ ZIP 读取错误:', err.message);
      zipfile?.close();
      process.exit(1);
    });

    zipfile.readEntry();
  }
);
