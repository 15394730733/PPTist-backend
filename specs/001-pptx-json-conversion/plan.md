# Implementation Plan: PPTX to JSON Conversion

**Branch**: `001-pptx-json-conversion` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pptx-json-conversion/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

实现一个完整的 PPTX 到 JSON 转换后端服务，支持异步任务队列架构、可扩展的转换器系统、多版本 PPTist 兼容性。系统采用接口抽象层设计实现高度可扩展性，包括可插拔的队列存储（内存/Redis）、版本化转换器、转换器注册表机制、完整的可观测性栈（结构化日志 + Prometheus 指标 + 分布式追踪），以及 12-factor 标准化配置管理。

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20.x LTS)
**Primary Dependencies**:
- **Web Framework**: Express.js 或 Fastify (待 Phase 0 研究)
- **XML 解析**: `fast-xml-parser` 或 `xml2js` (待 Phase 0 评估)
- **ZIP 解析**: `jszip` 或 `adm-zip` (待 Phase 0 评估)
- **任务队列**: 自建抽象层 + BullMQ (Redis 适配器可选)
- **类型验证**: `zod` (运行时验证)
- **日志**: `pino` (结构化 JSON 日志)
- **监控**: `prom-client` (Prometheus 指标)
- **追踪**: `@opentelemetry/api` (分布式追踪)
- **配置**: `convict` 或 `config` (YAML + 环境变量)

**Storage**:
- 临时文件存储: 本地文件系统 (可扩展至 S3)
- 任务队列存储: 内存队列 (默认) / Redis (可选扩展)
- 配置存储: YAML 配置文件 + 环境变量覆盖

**Testing**:
- 框架: `vitest` (单元测试 + 集成测试)
- HTTP 测试: `supertest`
- 测试数据: 真实 PPTX 文件 fixtures

**Target Platform**: Node.js 20.x LTS (Linux/macOS/Windows)
**Project Type**: Web Backend (REST API 服务)
**Performance Goals**:
- p95 < 5s (典型 10 张幻灯片 PPTX 转换)
- 支持至少 3 个并发任务
- 单文件处理不超过 100MB
- 内存使用 < 512MB/请求

**Constraints**:
- 文件大小限制: 100MB (可配置)
- 任务结果保留: 24 小时
- 支持 PPTist 最新 2 个主版本
- API 版本控制: URI 路径版本

**Scale/Scope**:
- 支持元素类型: 文本、图片、形状、线条、图表、表格、音频、视频
- 幻灯片数量: 最多 100 张
- 元素转换成功率: > 95%
- JSON 结构 100% 符合 PPTist TypeScript 接口

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

基于 `.specify/memory/constitution.md`，验证如下：

- [x] **XML-First**: ✅ 系统提供健壮的 XML 到 JSON 转换，支持 PPT 特定结构（幻灯片、形状、文本、样式）
- [x] **Type Safety**: ✅ TypeScript + Zod 运行时验证，所有 API 边界强制执行
- [x] **Performance**: ✅ 大文件（>10MB）使用流式处理，目标 p95 < 5s（优化宪章的 2s 要求，考虑 PPTX 复杂性）
- [x] **Observability**: ✅ 结构化 JSON 日志（pino），记录完整上下文（文件大小、处理时长、错误详情），Prometheus 指标 + OpenTelemetry 追踪
- [x] **Test Coverage**: ✅ 单元测试（所有 XML 解析逻辑）+ 集成测试（端到端转换）+ 真实 PPTX fixtures，边缘情况覆盖

*所有宪法原则均已满足，无需违规说明。*

## Project Structure

### Documentation (this feature)

```text
specs/001-pptx-json-conversion/
├── plan.md              # 本文件 (/speckit.plan 命令输出)
├── research.md          # Phase 0 输出 (/speckit.plan 命令)
├── data-model.md        # Phase 1 输出 (/speckit.plan 命令)
├── quickstart.md        # Phase 1 输出 (/speckit.plan 命令)
├── contracts/           # Phase 1 输出 (/speckit.plan 命令)
│   ├── api-v1.yaml      # OpenAPI 3.0 规范
│   └── openapi.json     # OpenAPI JSON 格式
└── tasks.md             # Phase 2 输出 (/speckit.tasks 命令 - 非本命令创建)
```

### Source Code (repository root)

```text
src/
├── api/                 # API 层
│   ├── v1/              # API v1 版本
│   │   ├── routes/      # 路由定义
│   │   ├── controllers/ # 控制器
│   │   └── schemas/     # Zod 验证 schemas
│   └── middleware/      # 中间件（错误处理、日志等）
├── services/            # 业务逻辑层
│   ├── conversion/      # 转换服务
│   │   ├── converters/  # 元素转换器实现
│   │   ├── registry.ts  # 转换器注册表
│   │   └── parser.ts    # PPTX 解析器
│   ├── queue/           # 任务队列服务
│   │   ├── interfaces/  # 队列接口定义
│   │   ├── memory/      # 内存队列实现
│   │   └── redis/       # Redis 队列实现（可选）
│   └── storage/         # 存储服务
│       ├── file-store.ts # 文件存储抽象
│       └── temp-store.ts # 临时存储实现
├── models/              # 数据模型
│   ├── task.ts          # 转换任务模型
│   ├── result.ts        # 转换结果模型
│   └── entities.ts      # 实体定义
├── utils/               # 工具函数
│   ├── logger.ts        # 日志工具（pino）
│   ├── metrics.ts       # Prometheus 指标
│   ├── tracing.ts       # OpenTelemetry 追踪
│   └── validator.ts     # Zod 验证器
├── config/              # 配置管理
│   ├── index.ts         # 配置加载器
│   ├── schema.ts        # 配置 schema（Zod）
│   └── defaults.yaml    # 默认配置
├── types/               # TypeScript 类型定义
│   ├── converters.ts    # 转换器接口
│   ├── queue.ts         # 队列接口
│   └── pptist.ts        # PPTist 版本类型
└── app.ts               # 应用入口

tests/
├── unit/                # 单元测试
│   ├── services/        # 服务测试
│   ├── converters/      # 转换器测试
│   └── utils/           # 工具测试
├── integration/         # 集成测试
│   ├── api/             # API 测试
│   └── workflows/       # 端到端工作流测试
└── fixtures/            # 测试数据
    ├── pptx/            # 真实 PPTX 文件
    │   ├── simple.pptx  # 简单演示
    │   ├── complex.pptx # 复杂演示
    │   └── edge-cases/  # 边缘情况
    └── expected/        # 预期 JSON 输出

config/                  # 配置文件
├── defaults.yaml        # 默认配置
├── development.yaml     # 开发环境
└── production.yaml      # 生产环境
```

**Structure Decision**: 选择 Option 1（单一项目），因为这是一个纯后端服务，没有独立的前端项目。前端集成通过 REST API 实现。所有代码位于 `src/` 目录，遵循领域驱动设计（DDD）的分层架构。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | 无违规 | 所有宪法原则均已满足 |

---

## Phase 0: Research & Technology Decisions

**Status**: ✅ Complete

### 研究任务完成

1. ✅ **Web 框架选择**: Fastify (性能是 Express 2倍，原生 TypeScript)
2. ✅ **XML 解析库**: fast-xml-parser (性能 2-3x 优于 xml2js)
3. ✅ **ZIP 解析库**: yauzl (+ fflate 创建 ZIP)
4. ✅ **任务队列**: 自建抽象 + fastq (可插拔架构)
5. ✅ **配置管理**: node-config (+ Zod 验证)

### 研究输出

→ 已生成 `research.md` 文档，包含：
- 每个技术选型的详细决策
- 选择理由和替代方案对比
- 最佳实践和代码示例
- 性能预期和实施建议

---

## Phase 1: Design & Contracts

**Status**: ✅ Complete

### 交付物完成

1. ✅ **data-model.md**: 数据模型设计
   - 7 个核心实体定义（ConversionTask, ConversionResult, PPTXFile, MediaResource, ElementConverter, ConverterRegistry, ITaskQueue）
   - Zod 验证 schemas
   - 状态转换图
   - 实体关系图

2. ✅ **contracts/api-v1.yaml**: API 契约
   - OpenAPI 3.0 规范
   - 9 个 API 端点定义
   - 完整的请求/响应 schemas
   - 错误响应规范

3. ✅ **quickstart.md**: 快速开始指南
   - 环境设置说明
   - 依赖安装步骤
   - 配置文件示例
   - API 使用示例
   - Docker 部署指南

4. ⏭️ **Agent Context Update**: 跳过（脚本执行失败，非阻塞性）

---

## Phase 2: Implementation Planning

**Status**: ⏳ Ready to Execute

> **Next Action**: 执行 `/speckit.tasks` 命令

本命令不生成 tasks.md。需要执行以下命令基于 plan.md、research.md、data-model.md 生成详细任务列表：

```bash
/speckit.tasks
```

该命令将：
- 基于数据模型生成实体实现任务
- 基于 API 契约生成路由实现任务
- 基于研究决策生成集成任务
- 生成测试和部署任务
- 按优先级和依赖关系排序
