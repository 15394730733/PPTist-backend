/**
 * 修复源文件中的导入路径
 * 移除 .js 扩展名以支持 Vitest 直接运行
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '../src');

function walkDir(dir, callback) {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory() && !filePath.includes('node_modules')) {
        walkDir(filePath, callback);
      } else if (file.endsWith('.ts')) {
        callback(filePath);
      }
    }
  } catch (error) {
    // 忽略无法访问的目录
  }
}

function fixImports(content) {
  // 匹配相对路径导入中的 .js 扩展名
  // 例如: import { X } from '../base-converter.js';
  const pattern = /from\s+['"](\.\.\/[^'"]*?\.js)['"]/g;

  return content.replace(pattern, (match, path) => {
    // 移除 .js 扩展名
    const newPath = path.replace(/\.js$/, '');
    return `from '${newPath}'`;
  });
}

function main() {
  const files = [];
  walkDir(SRC_DIR, (file) => files.push(file));

  console.log(`找到 ${files.length} 个源文件`);

  let fixedCount = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const fixed = fixImports(content);

      if (content !== fixed) {
        writeFileSync(file, fixed, 'utf-8');
        console.log(`✓ 已修复: ${file.replace(join(__dirname, '../'), '')}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`✗ 错误处理 ${file}:`, error.message);
    }
  }

  console.log(`\n完成! 共修复 ${fixedCount} 个文件`);
}

main();
