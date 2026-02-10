/**
 * 恢复测试文件 - 移除 .ts 扩展名
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = join(__dirname, '../tests/unit');

function walkDir(dir, callback) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.test.ts')) {
      callback(filePath);
    }
  }
}

function fixImports(content) {
  // 将 .ts 替换为无扩展名
  return content.replace(/from\s+['"](\.\.\/[^'"]*?)\.ts['"]/g, (match, path) => {
    return `from '${path}'`;
  });
}

function main() {
  const files = [];
  walkDir(TESTS_DIR, (file) => files.push(file));

  console.log(`恢复 ${files.length} 个测试文件`);

  let fixedCount = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const fixed = fixImports(content);

      if (content !== fixed) {
        writeFileSync(file, fixed, 'utf-8');
        fixedCount++;
      }
    } catch (error) {
      console.error(`错误:`, error.message);
    }
  }

  console.log(`完成! 共恢复 ${fixedCount} 个文件`);
}

main();
