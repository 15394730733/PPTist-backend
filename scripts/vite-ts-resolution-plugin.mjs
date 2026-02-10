/**
 * Vite/Vitest 插件：处理 .js 到 .ts 的路径映射
 * 用于 NodeNext 模块系统下的测试环境
 */

export function tsResolutionPlugin() {
  return {
    name: 'ts-resolution',

    resolveId(source, importer) {
      // 如果导入路径以 .js 结尾
      if (source.endsWith('.js')) {
        // 检查是否是相对路径导入
        if (source.startsWith('./') || source.startsWith('../')) {
          // 将 .js 替换为 .ts
          const tsSource = source.replace(/\.js$/, '.ts');

          // 返回转换后的路径，让 Vite 继续处理
          return {
            id: tsSource,
            external: false,
          };
        }
      }

      return null; // 使用默认解析
    },

    load(id) {
      // 确保加载 .ts 文件而不是 .js
      return null; // 使用默认加载
    },
  };
}
