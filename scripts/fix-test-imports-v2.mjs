/**
 * 修复测试文件中的导入路径 - V2
 * 将 .js 扩展名替换为 .ts 以支持 Vitest
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
  // 匹配 import 语句中的相对路径
  // 将 .js 替换为 .ts
  const pattern = /from\s+['"](\.\.\/.*?)(\.js)?['"]/g;

  return content.replace(pattern, (match, path, hasJs) => {
    // 如果是相对路径且没有扩展名或有 .js 扩展名
    if (path.startsWith('../')) {
      const newPath = path.replace(/\.js$/, '') + '.ts';
      return `from '${newPath}'`;
    }
    return match;
  });
}

function main() {
  const files = [];
  walkDir(TESTS_DIR, (file) => files.push(file));

  console.log(`找到 ${files.length} 个测试文件`);

  let fixedCount = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const fixed = fixImports(content);

      if (content !== fixed) {
        writeFileSync(file, fixed, 'utf-8');
        console.log(`✓ 已修复: ${file.replace(__dirname, '.')}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`✗ 错误处理 ${file}:`, error.message);
    }
  }

  console.log(`\n完成! 共修复 ${fixedCount} 个文件`);
}

main();
