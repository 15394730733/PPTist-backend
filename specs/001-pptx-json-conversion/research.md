# Research & Technology Decisions

**Feature**: PPTX to JSON Conversion
**Date**: 2026-01-24
**Status**: ✅ Complete

## Executive Summary

本文档记录了 PPTX 到 JSON 转换服务的技术选型研究结果。基于项目需求（高性能、可扩展性、类型安全、大文件处理），我们推荐以下技术栈：

| 组件 | 推荐方案 | 核心理由 |
|------|---------|---------|
| **Web 框架** | Fastify | 性能是 Express 2倍，原生 TypeScript，流式文件处理 |
| **XML 解析** | fast-xml-parser | 性能 2-3x 优于 xml2js，命名空间处理优秀 |
| **ZIP 解析** | yauzl (+ fflate) | 流式处理，内存恒定，100MB 文件无压力 |
| **任务队列** | 自建抽象 + fastq | 可插拔架构，默认内存队列，零外部依赖 |
| **配置管理** | node-config (+ Zod) | YAML 支持，多环境配置，12-factor 标准 |

---

## Decision 1: Web Framework - Fastify ✅

### Decision

**推荐使用 Fastify** 作为 Web 框架。

### Rationale

1. **性能优势显著**
   - 吞吐量：25,000-30,000 请求/秒（Express 约 15,000 请求/秒）
   - p95 延迟显著更低，符合项目目标（p95 < 5s）
   - 更高效的并发处理能力（支持 3 个并发任务）

2. **TypeScript 原生支持**
   - 完整的类型定义（`FastifyInstance`, `FastifyRequest`, `FastifyReply`）
   - 自动类型推导，编译时错误检查
   - JSON Schema 验证与 TypeScript 类型无缝集成

3. **文件上传和流式处理**
   - `@fastify/multipart`：流式处理文件，避免内存爆炸
   - 原生流式响应支持，适合大文件下载
   - 支持最大 100MB 文件上传（项目需求）

4. **中间件生态**
   - 官方插件维护质量高（CORS, Helmet, Rate-limit, Swagger）
   - BullMQ 集成插件（`fastify-queue`）完美契合异步队列架构

### Alternatives Considered

**Express.js** ❌
- 性能仅为 Fastify 的 50%
- TypeScript 支持需手动维护 `@types/express`
- 文件上传性能较弱（`multer` 磁盘存储）

**NestJS** ❌
- 过度设计，对于单一功能服务过于复杂
- 额外的抽象层带来性能开销
- 学习成本高

### Best Practices

```typescript
// app.ts
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      serialization: 'json'  // 结构化日志
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID()
  })

  // 文件上传
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024  // 100MB
    }
  })

  return app
}
```

### Sources

- [Express or Fastify in 2025: What's the Right Node.js Framework?](https://medium.com/codetodeploy/express-or-fastify-in-2025-whats-the-right-node-js-framework-for-you-6ea247141a86)
- [Fastify Performance Benchmark](https://novasphereailab.com/blog/express-vs-fastify-for-node)
- [@fastify/multipart Documentation](https://www.npmjs.com/package/@fastify/multipart)
- [Video Streaming with Fastify](https://nearform.com/digital-community/how-to-implement-video-streaming-with-fastify/)

---

## Decision 2: XML Parser - fast-xml-parser ✅

### Decision

**推荐使用 fast-xml-parser** 解析 PPTX 的 XML 结构。

### Rationale

1. **性能优势**
   - 比 xml2js 快 2-3 倍
   - 纯 JavaScript 实现，无 C/C++ 依赖
   - 周下载量 5000 万+（xml2js 约 900 万）

2. **命名空间处理**
   - 内置 `removeNSPrefix` 选项，优雅处理 Office XML 命名空间（`p:`, `a:`）
   - 支持选择性忽略属性（字符串数组、正则表达式）
   - PPTX 大量使用命名空间，fast-xml-parser 天然适配

3. **TypeScript 支持**
   - 内置完整类型定义
   - 230+ 代码示例，Context7 评分 83.5

4. **配置灵活性**
   - 丰富的解析选项（`ignoreAttributes`, `parseNodeValue`, `stopNodes`）
   - 支持选择性解析（`only` 选项）
   - 大文件优化（`stopNodes` 跳过嵌入对象）

### Alternatives Considered

**xml2js** ❌
- 不支持真正的流式解析，会加载整个文件到内存
- 大文件（>100MB）会报错 "Cannot create a string longer than..."
- 命名空间处理需手动配置 processors

**sax-js** ⚠️
- 适合超大文件（>1GB）的流式解析
- 但需要手动编写复杂的状态机逻辑
- 不提供直接的 JSON 转换

### Best Practices

```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  // 命名空间处理
  removeNSPrefix: true,          // 移除 p:, a: 前缀
  ignoreAttributes: false,        // 保留属性（PPTX 需要样式）
  attributeNamePrefix: '',        // 移除 @_ 前缀

  // 值处理
  parseNodeValue: true,
  parseAttributeValue: true,
  trimValues: true,

  // PPTX 优化
  stopNodes: ['*.pic', '*.oleObj'], // 跳过大型嵌入对象
  only: []                        // 保留全部标签
});

// 解析幻灯片 XML
const slideData = parser.parse(xmlString);
```

### Sources

- [fast-xml-parser GitHub](https://github.com/NaturalIntelligence/fast-xml-parser)
- [How I developed the fastest XML parser](https://tnickel.de/2020/08/30/2020-08-how-the-fastest-xml-parser-is-build/)
- [Processing large XML files](https://medium.com/@assertis/processing-large-xml-files-fa23b271e06d)
- [NPM Compare: fast-xml-parser vs xml2js](https://npm-compare.com/fast-xml-parser,libxmljs,xml,xml-js,xml2js,xmlbuilder)

---

## Decision 3: ZIP Library - yauzl ✅

### Decision

**推荐使用 yauzl** 解压 PPTX 文件，**fflate** 创建 ZIP 输出。

### Rationale

1. **内存效率（关键决策因素）**
   - yauzl 采用流式处理，**永不加载完整文件到内存**
   - JSZip 处理 300MB 文件消耗 6-6.5GB RAM
   - yauzl 内存使用可控，即使处理包含大量文件的 ZIP 包

2. **流式处理能力**
   - 原生支持 Node.js Stream API
   - 逐步解压：逐个文件处理，无需等待完整解压
   - 适合 PPTX 场景：先提取 `ppt/slides/*.xml`，再按需提取媒体资源

3. **大文件支持**
   - 严格遵循 ZIP 规范设计，读取中央目录而非扫描所有文件头
   - 支持 100MB PPTX 文件（项目需求）
   - 处理包含大量文件的 ZIP 包时性能稳定

4. **维护状态**
   - 持续维护，专为 Node.js 大文件场景设计
   - JSZip 自 2022 年 8 月以来未发布新版本，可能处于维护停滞

### Alternatives Considered

**JSZip** ❌
- 致命问题：内存泄漏（300MB 文件 → 6GB RAM）
- 不支持流式处理，全部加载到内存
- 维护停滞

**adm-zip** ⚠️
- 同步 API，阻塞事件循环，不适合高并发
- 性能不如 fflate 和 yauzl
- 适合快速原型，不适合生产环境

**fflate** ✅（用于创建 ZIP）
- 性能最强，比 JSZip 快 2-3 倍
- 适合创建 ZIP 输出（打包 JSON + 媒体文件）
- 但不推荐用于解压（API 不如 yauzl 直观）

### Best Practices

```typescript
import yauzl from 'yauzl';

async function extractPPTX(pptxPath: string) {
  return new Promise((resolve, reject) => {
    yauzl.open(pptxPath, {
      lazyEntries: true,  // ✅ 流式处理
      strictFileNames: false,
      validateEntrySizes: false
    }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.on('entry', (entry) => {
        if (entry.fileName.startsWith('ppt/slides/slide')) {
          // 提取幻灯片 XML
          zipfile.openReadStream(entry, (err, readStream) => {
            const chunks: Buffer[] = [];
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', () => {
              const content = Buffer.concat(chunks);
              // 处理 XML...
              zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();  // 跳过其他文件
        }
      });

      zipfile.on('end', () => resolve(/*...*/));
      zipfile.readEntry();  // 开始处理
    });
  });
}
```

### Sources

- [JSZip Issue #135 - High RAM Consumption](https://github.com/Stuk/jszip/issues/135)
- [yauzl GitHub Repository](https://github.com/thejoshwolfe/yauzl)
- [fflate Official Website](https://101arrowz.github.io/fflate/)
- [fflate Performance Benchmarks](https://101arrowz.github.io/fflate/)

---

## Decision 4: Task Queue - Custom Abstraction + fastq ✅

### Decision

**推荐自建轻量级抽象层**，使用 fastq 作为内存队列引擎，支持可插拔的 Redis 扩展。

### Rationale

1. **完美契合项目需求**
   - **FR-042**: 默认内存队列（零外部依赖）✅
   - **FR-043**: 可插拔架构，支持未来切换至 Redis ✅
   - BullMQ 硬依赖 Redis，无法满足零依赖需求

2. **fastq 特性**
   - 轻量级、高性能内存队列
   - Promise 和 Callback 两种 API
   - 完整 TypeScript 支持
   - 并发控制（concurrency 参数）

3. **可扩展性**
   - 接口抽象层（`ITaskQueue`）
   - 工厂模式切换（内存 ↔ Redis）
   - 未来可扩展至 PostgreSQL/Agenda

4. **开发成本可控**
   - 预估 2-3 天开发时间
   - 核心代码约 500-800 行
   - 实现复杂度中等

### Alternatives Considered

**BullMQ** ❌
- 硬依赖 Redis，无法满足零依赖需求
- 强制引入 Redis 增加部署复杂度
- 对于简单的 PPTX 转换场景过于重量级

**Graphile Worker** ⚠️
- 基于 PostgreSQL，功能强大
- 但需要 PostgreSQL 依赖，不符合内存队列需求

### Architecture Design

```typescript
// 接口抽象层
interface ITaskQueue<T = any> {
  enqueue(task: T): Promise<string>;
  getStatus(taskId: string): Promise<TaskStatus>;
  getResult(taskId: string): Promise<TaskResult | null>;
}

// 内存队列实现
class InMemoryTaskQueue implements ITaskQueue {
  private queue: fastq.queueAsPromised<ConversionTask>;
  private tasks: Map<string, TaskState>;

  constructor(concurrency: number = 3) {
    this.queue = fastq.promise(this.worker.bind(this), concurrency);
  }

  async enqueue(task: ConversionTask): Promise<string> {
    this.tasks.set(task.taskId, {
      task,
      status: TaskStatus.QUEUED
    });
    this.queue.push(task);
    return task.taskId;
  }
}

// Redis 队列实现（可选）
class RedisTaskQueue implements ITaskQueue {
  private queue: Queue;  // BullMQ
  // ...
}

// 工厂模式切换
class TaskQueueFactory {
  static create(config: QueueConfig): ITaskQueue {
    switch (config.type) {
      case 'memory':
        return new InMemoryTaskQueue(config.concurrency);
      case 'redis':
        return new RedisTaskQueue(config.redis);
    }
  }
}
```

### Best Practices

1. **Phase 1**: 实现 `InMemoryTaskQueue`（Week 1）
2. **Phase 2**: 集成到 PPTX 转换服务（Week 2）
3. **Phase 3**: 添加 Redis 支持（可选，Week 3）
4. **Phase 4**: 可观测性（Prometheus 指标，Week 4）

### Sources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [fastq GitHub Repository](https://github.com/mcollina/fastq)
- [BullMQ GitHub Discussion - No Redis Solution](https://github.com/taskforcesh/bullmq/discussions/2412)
- [Graphile Worker](https://worker.graphile.org/)

---

## Decision 5: Configuration Management - node-config ✅

### Decision

**推荐使用 node-config (+ Zod 验证)** 管理项目配置。

### Rationale

1. **YAML 支持质量**
   - ✅ 原生支持 YAML 配置文件（安装 `js-yaml` 即可）
   - ✅ 多环境配置自动合并（default → 环境 → local）
   - ❌ convict 不原生支持 YAML，需手动添加解析器

2. **环境变量覆盖**
   - ✅ 通过 `custom-environment-variables.json` 映射
   - ✅ 支持复杂数据类型（JSON、YAML、数组）
   - ✅ 完全遵循 12-factor app 原则

3. **多环境配置管理**
   - ✅ 完美的多环境支持（node-config 核心优势）
   - ✅ 通过文件命名自动加载（development.yaml, production.yaml）
   - ✅ 通过 `NODE_ENV` 自动切换

4. **TypeScript 支持**
   - ✅ 支持 TypeScript 配置文件（.ts）
   - ⚠️ convict 需要 `ts-convict` 额外包

5. **社区维护**
   - ✅ 活跃维护（2025年仍在更新）
   - ✅ 周下载量高，社区成熟
   - ⚠️ convict 最后更新 2023年1月

### Alternatives Considered

**convict + ts-convict** ⚠️
- 内置强大的验证系统（convict 核心优势）
- 但 YAML 支持需要额外配置
- 多环境配置需要手动实现
- 适合对配置验证要求极高的项目

**纯 Zod + dotenv** ⚠️
- 轻量级，TypeScript 原生支持
- 但不支持 YAML 配置文件
- 需要手动实现配置加载逻辑

### Best Practices

**目录结构**:
```
config/
├── default.yaml          # 默认配置
├── development.yaml       # 开发环境
├── production.yaml        # 生产环境
└── custom-environment-variables.json  # 环境变量映射
```

**配置示例**:
```yaml
# default.yaml
server:
  port: 3000

taskQueue:
  type: "memory"  # memory | redis
  concurrency: 3

fileProcessing:
  maxFileSize: 52428800  # 50MB
  base64Threshold: 1048576  # 1MB
```

**配置加载 + Zod 验证**:
```typescript
import config from 'config';
import { z } from 'zod';

const ConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535)
  }),
  taskQueue: z.object({
    type: z.enum(['memory', 'redis']),
    concurrency: z.number().int().min(1)
  })
});

export const appConfig = ConfigSchema.parse(config);
```

### Sources

- [node-config GitHub Repository](https://github.com/node-config/node-config)
- [node-config Wiki - Environment Variables](https://github.com/node-config/node-config/wiki/Environment-Variables)
- [convict on npm](https://www.npmjs.com/package/convict)
- [ts-convict on npm](https://www.npmjs.com/package/ts-convict)
- [Masking Sensitive Data in Logs](https://medium.com/@jaiprajapati3/masking-of-user-data-in-logs-700850e233f5)

---

## Technology Stack Summary

### 核心依赖

```json
{
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/multipart": "^8.0.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/swagger": "^8.0.0",
    "fast-xml-parser": "^4.3.0",
    "yauzl": "^3.0.0",
    "fflate": "^0.8.0",
    "fastq": "^1.15.0",
    "config": "^3.3.0",
    "js-yaml": "^4.1.0",
    "zod": "^3.22.0",
    "pino": "^8.16.0",
    "prom-client": "^15.0.0",
    "@opentelemetry/api": "^1.7.0"
  },
  "devDependencies": {
    "@types/yauzl": "^2.10.0",
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "typescript": "^5.3.0"
  }
}
```

### 性能预期

- **解析速度**: 100MB PPTX 文件约 2-5 秒
- **内存占用**: 峰值约 200-300MB（远低于 JSZip 的 6GB+）
- **并发支持**: 稳定支持 3 个并发任务
- **吞吐量**: 25,000-30,000 请求/秒（Fastify）

---

## Next Steps

1. ✅ Phase 0 完成 - 技术选型明确
2. ⏭️ Phase 1 - 设计数据模型和 API 契约
3. ⏭️ Phase 2 - 生成详细任务列表

**Status**: Ready for Phase 1 → Execute `/speckit.plan` to continue design phase.
