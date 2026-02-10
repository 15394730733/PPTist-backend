# 性能测试指南

本文档介绍如何使用 PPTist 后端的性能基准测试工具。

## 目录

- [快速开始](#快速开始)
- [基准测试](#基准测试)
- [性能对比](#性能对比)
- [性能指标](#性能指标)
- [CI/CD 集成](#cicd-集成)
- [性能目标](#性能目标)

---

## 快速开始

### 运行快速基准测试

```bash
npm run benchmark:quick
```

这将运行 5 次迭代，使用默认的测试文件。

### 运行完整基准测试

```bash
npm run benchmark:full
```

这将运行 50 次迭代，包含预热阶段。

---

## 基准测试

### 基本用法

```bash
node scripts/benchmark.js [options]
```

### 命令行选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--iterations <n>` | 迭代次数 | 10 |
| `--concurrency <n>` | 并发请求数 | 1 |
| `--file <path>` | 要测试的 PPTX 文件 | tests/fixtures/simple.pptx |
| `--output <path>` | 结果输出目录 | benchmark-results |
| `--format <fmt>` | 输出格式：json, csv, html | json |
| `--warmup` | 运行预热迭代 | false |

### 示例

#### 1. 测试特定文件

```bash
node scripts/benchmark.js --file path/to/large.pptx
```

#### 2. 测试并发性能

```bash
node scripts/benchmark.js --concurrency 10 --iterations 20
```

#### 3. 生成 HTML 报告

```bash
node scripts/benchmark.js --format html
```

#### 4. 自定义输出目录

```bash
node scripts/benchmark.js --output my-results
```

### NPM 脚本快捷方式

```bash
# 快速测试（5次迭代）
npm run benchmark:quick

# 完整测试（50次迭代 + 预热）
npm run benchmark:full

# 并发测试（5并发，20次迭代）
npm run benchmark:concurrent
```

---

## 性能对比

### 对比两次基准测试结果

```bash
node scripts/compare-benchmarks.js before.json after.json
```

### 典型工作流程

1. **运行基准测试（优化前）**
   ```bash
   npm run benchmark:full
   # 输出: benchmark-results/benchmark-2025-01-29T12-00-00-000Z.json
   ```

2. **进行性能优化**

3. **运行基准测试（优化后）**
   ```bash
   npm run benchmark:full
   # 输出: benchmark-results/benchmark-2025-01-29T13-00-00-000Z.json
   ```

4. **对比结果**
   ```bash
   npm run benchmark:compare \
     benchmark-results/benchmark-2025-01-29T12-00-00-000Z.json \
     benchmark-results/benchmark-2025-01-29T13-00-00-000Z.json
   ```

### 对比报告示例

```
📊 Performance Comparison Report
════════════════════════════════════════════════════════════

🖥️  System Information
──────────────────────────────────────────────────────────
   Platform:     linux → linux
   Node Version: v20.0.0 → v20.0.0
   CPUs:         8 → 8

⏱️  Duration Comparison
──────────────────────────────────────────────────────────
   Mean      :    1250.50 ms →    980.30 ms (-21.59%) ✅
   Median    :    1230.00 ms →    970.00 ms (-21.14%) ✅
   P95       :    1450.00 ms →   1150.00 ms (-20.69%) ✅

🚀 Throughput Comparison
──────────────────────────────────────────────────────────
   Mean      :    2.34 MB/s →    2.98 MB/s (+27.35%) ✅
   Median    :    2.38 MB/s →    3.01 MB/s (+26.47%) ✅
   P95       :    2.01 MB/s →    2.53 MB/s (+25.87%) ✅

📈 Overall Performance Summary
──────────────────────────────────────────────────────────
   ✅ Duration improved by 21.59%
   ✅ Throughput improved by 27.35%

🎯 Verdict
──────────────────────────────────────────────────────────
   ✅ SIGNIFICANT IMPROVEMENT - Performance greatly enhanced!
```

---

## 性能指标

### 关键指标说明

#### 1. Duration（持续时间）

- **Mean**: 平均处理时间
- **Median**: 中位数处理时间（对异常值不敏感）
- **Min/Max**: 最快/最慢处理时间
- **P95/P99**: 95%/99% 分位数（95%/99% 的请求在此时间内完成）
- **Std Dev**: 标准差（衡量性能波动）

#### 2. Throughput（吞吐量）

- 每秒处理的字节数
- 反映处理大文件的能力
- 单位: B/s, KB/s, MB/s

### 性能目标

| 指标 | 小文件 (<1MB) | 中等文件 (1-10MB) | 大文件 (>10MB) |
|------|--------------|------------------|----------------|
| Mean Duration | < 500 ms | < 2 s | < 10 s |
| P95 Duration | < 1 s | < 3 s | < 15 s |
| Throughput | > 2 MB/s | > 5 MB/s | > 10 MB/s |
| Std Dev | < 100 ms | < 500 ms | < 2 s |

---

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Performance Tests

on:
  pull_request:
    paths:
      - 'src/**'
  push:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run benchmark
        run: npm run benchmark:quick

      - name: Upload benchmark results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmark-results/

      # 可选：对比性能变化
      - name: Download previous results
        uses: actions/download-artifact@v3
        with:
          name: benchmark-results
          path: previous-results/

      - name: Compare benchmarks
        run: |
          node scripts/compare-benchmarks.js \
            previous-results/*.json \
            benchmark-results/*.json
```

### 性能回归检测

```yaml
# 在 CI 中添加性能门禁
- name: Check for performance regression
  run: |
    node scripts/compare-benchmarks.js \
      baseline.json \
      current.json > comparison.txt

    # 检查是否出现性能退化
    if grep -q "SIGNIFICANT REGRESSION" comparison.txt; then
      echo "Performance regression detected!"
      exit 1
    fi
```

---

## 性能分析技巧

### 1. 识别瓶颈

使用 Node.js 性能分析工具：

```bash
# 生成 CPU profile
node --prof scripts/benchmark.js

# 处理 profile 数据
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > profile.txt
```

### 2. 内存分析

```bash
# 监控内存使用
node --expose-gc scripts/benchmark.js

# 使用 Chrome DevTools
node --inspect scripts/benchmark.js
# 然后在 Chrome 中打开 chrome://inspect
```

### 3. 并发分析

```bash
# 测试不同并发级别
for i in 1 2 5 10 20; do
  echo "Testing concurrency: $i"
  npm run benchmark:concurrent -- --concurrency $i
done
```

---

## 故障排查

### 基准测试不稳定

**症状**: 结果波动大，标准差高

**解决方案**:
1. 增加迭代次数
2. 启用预热 (`--warmup`)
3. 关闭其他应用程序
4. 使用 `--iterations` 获取更多样本

### 性能突然下降

**检查清单**:
1. [ ] 代码变更
2. [ ] 依赖更新
3. [ ] 系统资源占用
4. [ ] 测试文件是否相同
5. [ ] 环境配置是否一致

### 内存不足

**解决方案**:
```bash
# 增加 Node.js 堆内存
NODE_OPTIONS=--max-old-space-size=4096 npm run benchmark
```

---

## 最佳实践

1. **运行基准测试前**
   - 关闭不必要的应用
   - 确保系统资源充足
   - 使用一致的测试文件

2. **优化工作流程**
   - 建立性能基线
   - 记录每次优化的结果
   - 使用版本控制保存基准结果

3. **CI/CD 集成**
   - 在每次 PR 时运行基准测试
   - 设置性能回归告警
   - 保存历史数据进行趋势分析

4. **报告和可视化**
   - 使用 HTML 格式生成可视化报告
   - 对比不同版本的性能
   - 跟踪性能趋势

---

## 参考资源

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [V8 Performance Optimization](https://v8.dev/blog/fast-for-in-in-v8)
- [Benchmark.js Documentation](https://benchmarkjs.com/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
