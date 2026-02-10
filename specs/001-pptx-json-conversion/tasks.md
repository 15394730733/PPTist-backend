# Implementation Tasks: PPTX to JSON Conversion

**Feature Branch**: `001-pptx-json-conversion`
**Date**: 2026-01-24
**Status**: Draft

## Overview

本文档提供 PPTX 到 JSON 转换服务的详细实施任务列表，按用户故事组织，确保每个用户故事可独立实现和测试。

**技术栈**:
- Web 框架: Fastify
- XML 解析: fast-xml-parser
- ZIP 解析: yauzl + fflate
- 任务队列: 自建抽象 + fastq
- 配置管理: node-config + Zod
- 类型验证: Zod
- 日志: Pino
- 监控: prom-client
- 测试: Vitest

---

## Phase 1: Setup & Project Initialization

**目标**: 初始化项目结构，配置开发环境，建立基础架构。

- [ ] T001 初始化 TypeScript 项目并配置 package.json
- [ ] T002 [P] 配置 TypeScript 编译选项（tsconfig.json：strict mode, path mapping）
- [ ] T003 [P] 配置 ESLint 和 Prettier（.eslintrc.js, .prettierrc）
- [ ] T004 [P] 创建项目目录结构（src/api, src/services, src/models, src/utils, src/config, src/types, tests/）
- [ ] T005 [P] 初始化 Git 仓库并创建 .gitignore
- [ ] T006 [P] 安装核心依赖（fastify, fast-xml-parser, yauzl, fflate, fastq, config, zod, pino, prom-client）
- [ ] T007 [P] 安装开发依赖（typescript, vitest, @types/node, @types/yauzl, eslint, prettier）
- [ ] T008 [P] 创建配置文件结构（config/ 目录，default.yaml, development.yaml, production.yaml）
- [ ] T009 创建默认配置文件（config/default.yaml：服务器、队列、文件处理、日志配置）
- [ ] T010 [P] 创建开发环境配置（config/development.yaml：debug 日志，内存队列）
- [ ] T011 [P] 创建生产环境配置（config/production.yaml：info 日志，Redis 队列可选）
- [ ] T012 [P] 创建环境变量映射文件（config/custom-environment-variables.json）
- [ ] T013 实现配置加载模块（src/config/index.ts：加载配置，Zod 验证，脱敏日志）
- [ ] T014 [P] 创建环境变量 .env 示例文件（.env.example）
- [ ] T015 创建 Docker 配置文件（Dockerfile, .dockerignore）

---

## Phase 2: Foundational Infrastructure

**目标**: 实现阻塞所有用户故事的基础设施和核心服务。

### 2.1 日志和监控

- [ ] T016 [P] 实现日志工具（src/utils/logger.ts：Pino 实例，脱敏配置）
- [ ] T017 [P] 实现 Prometheus 指标工具（src/utils/metrics.ts：register, histogram, counter）
- [ ] T018 [P] 实现错误处理中间件（src/middleware/errorHandler.ts：结构化错误响应）
- [ ] T019 [P] 实现 ID 生成工具（src/utils/uuid.ts：UUID v4 生成器）

### 2.2 Fastify 应用框架

- [ ] T020 创建 Fastify 应用实例（src/app.ts：logger, trustProxy, requestId）
- [ ] T021 [P] 注册核心插件（src/app.ts：@fastify/cors, @fastify/helmet）
- [ ] T022 [P] 注册文件上传插件（src/app.ts：@fastify/multipart，100MB 限制）
- [ ] T023 实现健康检查端点（src/api/v1/health.ts：/api/v1/health）
- [ ] T024 [P] 实现请求日志中间件（src/middleware/requestLogger.ts：记录请求 ID、方法、路径）
- [ ] T025 [P] 实现全局错误处理器（src/app.ts：setErrorHandler）

### 2.3 任务队列基础设施

- [ ] T026 [P] 定义任务队列接口（src/types/queue.ts：ITaskQueue 接口定义）
- [ ] T027 [P] 定义任务状态枚举（src/types/queue.ts：TaskStatus enum）
- [ ] T028 [P] 定义转换任务类型（src/types/task.ts：ConversionTask 接口）
- [ ] T029 [P] 实现内存任务队列（src/queue/memory-queue.ts：基于 fastq，支持并发 3）
- [ ] T030 [P] 实现任务状态管理（src/queue/memory-queue.ts：Map 存储任务状态）
- [ ] T031 [P] 实现任务结果存储（src/queue/memory-queue.ts：24 小时保留，自动清理）
- [ ] T032 [P] 实现队列统计功能（src/queue/memory-queue.ts：getStats 方法）
- [ ] T033 [P] 实现队列工厂（src/queue/factory.ts：根据配置创建内存或 Redis 队列）
- [ ] T034 [P] 配置队列初始化（src/config/index.ts：队列类型、并发数、保留时间）

### 2.4 数据模型

- [ ] T035 [P] 实现 PPTX 文件验证模型（src/models/pptx-file.ts：PPTXFile 接口，validate 方法）
- [ ] T036 [P] 实现转换任务模型（src/models/task.ts：ConversionTask 类，状态转换）
- [ ] T037 [P] 实现转换结果模型（src/models/result.ts：ConversionResult 接口）
- [ ] T038 [P] 实现元数据模型（src/models/metadata.ts：ConversionMetadata 接口）
- [ ] T039 [P] 实现警告模型（src/models/warning.ts：ConversionWarning 接口）
- [ ] T040 [P] 实现媒体资源模型（src/models/media.ts：MediaResource 接口）

### 2.5 转换器基础设施

- [ ] T041 [P] 定义元素转换器接口（src/types/converters.ts：ElementConverter 接口）
- [ ] T042 [P] 定义转换上下文接口（src/types/converters.ts：ConversionContext 接口）
- [ ] T043 [P] 实现转换器注册表（src/services/conversion/registry.ts：ConverterRegistry 类）
- [ ] T044 [P] 实现注册表工厂（src/services/conversion/registry.ts：getInstance 单例）
- [ ] T045 [P] 定义 PPTist 版本类型（src/types/pptist.ts：PPTistVersion 接口）

---

## Phase 3: User Story 1 - 上传并转换 PPTX 文件 (P1)

**目标**: 实现核心 PPTX 转换功能，支持单文件上传、异步转换、状态查询和结果下载。

**独立测试标准**: 上传真实 PPTX 文件，验证输出 JSON 可导入 PPTist 并正确渲染。

### 3.1 PPTX 解析服务

- [ ] T046 [P] [US1] 实现 PPTX 文件解压服务（src/services/pptx/unzip.ts：yauzl 流式解压，提取 XML）
- [ ] T047 [US1] 实现 PPTX XML 解析服务（src/services/pptx/parser.ts：fast-xml-parser 配置，解析 slides/*.xml）
- [ ] T048 [US1] 实现幻灯片提取逻辑（src/services/pptx/parser.ts：提取 ppt/slides/slide*.xml）
- [ ] T049 [US1] 实现媒体文件提取（src/services/pptx/extract-media.ts：提取 ppt/media/*，判断大小）
- [ ] T050 [US1] 实现 PPTX 文件验证（src/services/pptx/validator.ts：检查 ZIP 结构、签名、加密）
- [ ] T051 [US1] 实现坐标转换工具（src/utils/coordinates.ts：EMU 到像素转换）

### 3.2 核心转换器实现

- [ ] T052 [P] [US1] 实现文本转换器（src/services/conversion/converters/text.ts：PPTX 文本 → PPTTextElement）
- [ ] T053 [P] [US1] 实现图片转换器（src/services/conversion/converters/image.ts：PPTX 图片 → PPTImageElement，base64 或文件）
- [ ] T054 [P] [US1] 实现形状转换器（src/services/conversion/converters/shape.ts：PPTX 形状 → PPTShapeElement）
- [ ] T055 [P] [US1] 实现线条转换器（src/services/conversion/converters/line.ts：PPTX 线条 → PPTLineElement）
- [ ] T056 [P] [US1] 实现图表转换器（src/services/conversion/converters/chart.ts：PPTX 图表 → PPTChartElement）
- [ ] T057 [P] [US1] 实现表格转换器（src/services/conversion/converters/table.ts：PPTX 表格 → PPTTableElement）
- [ ] T058 [US1] 实现背景转换器（src/services/conversion/converters/background.ts：幻灯片背景 → SlideBackground）
- [ ] T059 [US1] 实现颜色转换工具（src/utils/color.ts：Office XML 颜色 → CSS 颜色格式）
- [ ] T060 [US1] 实现元素 ID 生成器（src/utils/id-generator.ts：UUID 生成，符合 PPTist 格式）

### 3.3 转换编排服务

- [ ] T061 [US1] 实现转换编排器（src/services/conversion/orchestrator.ts：协调整体转换流程）
- [ ] T062 [US1] 实现元素层级处理（src/services/conversion/orchestrator.ts：z-index 排序）
- [ ] T063 [US1] 实现组合元素处理（src/services/conversion/orchestrator.ts：Groups → groupId）
- [ ] T064 [US1] 实现动画提取（src/services/conversion/extractors/animation.ts：turningMode，元素动画）
- [ ] T065 [US1] 实现备注提取（src/services/conversion/extractors/notes.ts：Notes，Remark）

### 3.4 转换 API 端点

- [ ] T066 [P] [US1] 实现 POST /api/v1/convert 端点（src/api/v1/routes/convert.ts：文件上传，创建任务）
- [ ] T067 [US1] 实现文件上传处理器（src/api/v1/controllers/convert.ts：接收文件，验证大小）
- [ ] T068 [US1] 实现任务创建逻辑（src/api/v1/controllers/convert.ts：提交到队列，返回 taskId）
- [ ] T069 [P] [US1] 实现 GET /api/v1/tasks/:taskId 端点（src/api/v1/routes/tasks.ts：查询任务状态）
- [ ] T070 [US1] 实现状态查询处理器（src/api/v1/controllers/tasks.ts：返回状态、进度、结果）
- [ ] T071 [P] [US1] 实现 GET /api/v1/tasks/:taskId/result 端点（src/api/v1/routes/tasks.ts：下载 JSON）
- [ ] T072 [US1] 实现结果下载处理器（src/api/v1/controllers/tasks.ts：返回 JSON 或 404）
- [ ] T073 [P] [US1] 实现文件下载响应头（src/api/v1/controllers/tasks.ts：Content-Disposition）

### 3.5 转换核心逻辑

- [ ] T074 [US1] 实现主转换服务（src/services/conversion/index.ts：ConversionService 类）
- [ ] T075 [US1] 实现转换任务处理器（src/services/conversion/worker.ts：队列 worker 逻辑）
- [ ] T076 [US1] 实现进度更新机制（src/services/conversion/worker.ts：更新任务 progress 字段）
- [ ] T077 [US1] 实现错误处理和恢复（src/services/conversion/worker.ts：try-catch，错误分类）
- [ ] T078 [US1] 实现转换结果序列化（src/services/conversion/serializer.ts：生成 PPTist JSON）
- [ ] T079 [US1] 实现元数据收集器（src/services/conversion/collector.ts：统计元素、时长、文件大小）
- [ ] T080 [US1] 实现警告收集器（src/services/conversion/warnings.ts：不支持的元素、降级处理）

### 3.6 结果存储和下载

- [ ] T081 [P] [US1] 实现临时文件存储（src/services/storage/temp-store.ts：/tmp/pptx-conversion/{taskId}/）
- [ ] T082 [US1] 实现结果文件保存（src/services/storage/temp-store.ts：保存 JSON，保存媒体）
- [ ] T083 [US1] 实现 ZIP 打包功能（src/services/storage/zip-creator.ts：fflate 打包 JSON + 媒体）
- [ ] T084 [P] [US1] 实现 GET /api/v1/tasks/:taskId/result/zip 端点（src/api/v1/routes/tasks.ts：下载 ZIP）
- [ ] T085 [US1] 实现 ZIP 下载处理器（src/api/v1/controllers/tasks.ts：生成 ZIP，流式响应）

### 3.7 错误处理和边缘情况

- [ ] T086 [P] [US1] 实现文件过大错误（FR 边缘情况：>100MB，返回 413）
- [ ] T087 [P] [US1] 实现加密文件检测（FR 边缘情况：密码保护，返回明确错误）
- [ ] T088 [P] [US1] 实现损坏文件处理（FR 边缘情况：无效 ZIP，返回清晰错误）
- [ ] T089 [US1] 实现不支持元素降级（FR 边缘情况：SmartArt → 图片或标注）
- [ ] T090 [P] [US1] 实现外部媒体处理（FR 边缘情况：尝试下载，失败保留 URL）
- [ ] T091 [US1] 实现内存不足优雅降级（FR 边缘情况：返回部分结果或错误）
- [ ] T092 [US1] 实现宏和 ActiveX 忽略（FR 边缘情况：忽略代码，保留可视化）

### 3.8 可观测性

- [ ] T093 [P] [US1] 实现转换日志记录（src/services/conversion/logger.ts：任务创建、状态变更、完成、错误）
- [ ] T094 [P] [US1] 实现 Prometheus 转换指标（src/utils/metrics.ts：转换时长、队列长度、错误率）
- [ ] T095 [US1] 实现请求 ID 追踪（src/middleware/request-logger.ts：X-Request-ID 头）
- [ ] T096 [P] [US1] 实现日志脱敏（src/utils/logger.ts：敏感信息不记录）

---

## Phase 4: User Story 2 - 批量转换 PPTX 文件 (P2)

**目标**: 支持一次上传多个 PPTX 文件，为每个文件创建独立任务，支持批量状态查询。

**独立测试标准**: 同时上传 3-5 个不同 PPTX 文件，验证每个文件成功创建任务，可独立查询状态和获取结果。

### 4.1 批量上传 API

- [ ] T097 [P] [US2] 实现 POST /api/v1/convert/batch 端点（src/api/v1/routes/convert.ts：批量上传）
- [ ] T098 [US2] 实现批量文件上传处理器（src/api/v1/controllers/convert.ts：接收文件数组）
- [ ] T099 [US2] 实现批量任务创建逻辑（src/api/v1/controllers/convert.ts：循环提交到队列）
- [ ] T100 [US2] 实现批量任务响应（src/api/v1/controllers/convert.ts：返回所有 taskId）

### 4.2 批量状态查询

- [ ] T101 [P] [US2] 实现 POST /api/v1/tasks/batch 端点（src/api/v1/routes/tasks.ts：批量查询）
- [ ] T102 [US2] 实现批量状态查询处理器（src/api/v1/controllers/tasks.ts：接收 taskIds 数组）
- [ ] T103 [US2] 实现批量状态汇总（src/api/v1/controllers/tasks.ts：计算 queued/processing/completed/failed 数量）
- [ ] T104 [US2] 实现批量响应格式（src/api/v1/controllers/tasks.ts：返回任务状态映射 + 汇总）

---

## Phase 5: User Story 3 - 转换结果验证与预览 (P3)

**目标**: 提供转换结果预览功能，显示元数据、元素统计、转换警告，让用户在下载前验证。

**独立测试标准**: 上传 PPTX 文件，查看元数据，确认幻灯片数量、元素统计准确。

### 5.1 预览 API

- [ ] T105 [P] [US3] 实现 GET /api/v1/tasks/:taskId/preview 端点（src/api/v1/routes/tasks.ts：预览元数据）
- [ ] T106 [US3] 实现预览处理器（src/api/v1/controllers/tasks.ts：返回 metadata，不包含完整 JSON）
- [ ] T107 [P] [US3] 实现预览响应格式（src/api/v1/controllers/tasks.ts：metadata，warnings）

### 5.2 元数据增强

- [ ] T108 [US3] 实现幻灯片数量统计（src/services/conversion/collector.ts：countSlides）
- [ ] T109 [US3] 实现元素类型统计（src/services/conversion/collector.ts：统计 text/image/shape/line/chart/table）
- [ ] T110 [US3] 实现文件大小统计（src/services/conversion/collector.ts：原始大小，JSON 大小）
- [ ] T111 [P] [US3] 实现处理时长统计（src/services/conversion/collector.ts：记录开始和结束时间）

### 5.3 警告系统

- [ ] T112 [P] [US3] 定义警告类型枚举（src/types/warning.ts：UNSUPPORTED_ELEMENT, DOWNGRADED, MISSING_MEDIA）
- [ ] T113 [P] [US3] 实现不支持的元素检测（src/services/conversion/detectors/unsupported.ts：SmartArt，3D 模型）
- [ ] T114 [P] [US3] 实现降级处理警告（src/services/conversion/warnings.ts：记录降级为图片的元素）
- [ ] T115 [US3] 实现缺失媒体警告（src/services/conversion/warnings.ts：外部链接下载失败）
- [ ] T116 [US3] 实现警告建议生成器（src/services/conversion/warnings.ts：提供修复建议）

---

## Phase 6: Polish & Cross-Cutting Concerns

**目标**: 完善可观测性、性能优化、安全加固，准备生产部署。

### 6.1 可观测性完善

- [ ] T117 [P] 实现分布式追踪（src/utils/tracing.ts：OpenTelemetry 初始化）
- [ ] T118 [P] 配置追踪导出（src/app.ts：@opentelemetry/api 注册）
- [ ] T119 [P] 实现 Prometheus 端点（src/utils/metrics.ts：/metrics 端点）

### 6.2 性能优化

- [ ] T120 [P] 实现大文件流式处理优化（src/services/pptx/unzip.ts：分块读取，避免内存峰值）
- [ ] T121 [P] 实现并发控制限制（src/queue/factory.ts：限制最多 3 个并发任务）
- [ ] T122 [P] 实现队列优先级（src/types/queue.ts：添加 priority 字段，支持加权）

### 6.3 安全加固

- [ ] T123 [P] 实现 MIME 类型验证（src/middleware/validation.ts：验证 application/vnd.openxmlformats-officedocument.presentationml.presentation）
- [ ] T124 [P] 实现文件名消毒（src/utils/sanitize.ts：移除路径遍历字符）
- [ ] T125 [P] 实现速率限制中间件（src/middleware/rate-limit.ts：可选，防止滥用）

### 6.4 文档和部署

- [ ] T126 [P] 编写 API 文档（基于 OpenAPI 生成 Swagger）
- [ ] T127 [P] 创建示例环境变量文件（.env.example）
- [ ] T128 [P] 编写 Docker Compose 配置（docker-compose.yml：API + Redis 可选）
- [ ] T129 [P] 编写部署指南（docs/deployment.md：生产环境部署步骤）
- [ ] T130 [P] 创建 README.md（项目说明、快速开始、贡献指南）

### 6.5 最终测试

- [ ] T131 编写集成测试套件（tests/integration/conversion.test.ts：端到端转换流程）
- [ ] T132 添加真实 PPTX 测试 fixtures（tests/fixtures/pptx/：simple.pptx, complex.pptx）
- [ ] T133 实现性能测试（tests/performance/conversion.test.ts：验证 SC-003 p95 < 5s）
- [ ] T134 实现负载测试（tests/load/concurrent.test.ts：验证 SC-009 3 个并发任务性能）

---

## Dependencies: User Story Completion Order

```
Phase 2 (Foundational) MUST complete before all user stories

User Stories can be implemented in parallel:
├── US1 (P1) - Core conversion ✅ MVP
├── US2 (P2) - Batch conversion (depends on US1 queue infrastructure) ✅
└── US3 (P3) - Preview (depends on US1 metadata collection) ✅

Phase 6 (Polish) AFTER all user stories complete
```

**Critical Path**:
```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 6 (Polish)
                                                      ↓
                                                Phase 4 (US2)
                                                      ↓
                                                Phase 5 (US3)
```

---

## Parallel Execution Opportunities

### Phase 1 (Setup): High Parallelism
- T002-T015: 大部分配置和目录创建可并行

### Phase 2 (Foundational): Medium Parallelism
- T016-T019: 日志/监控工具可并行
- T020-T025: Fastify 框架可并行
- T026-T034: 队列基础设施可并行

### Phase 3 (US1): Medium Parallelism
- T046-T050: PPTX 解析服务可并行（独立模块）
- T052-T059: 转换器可并行（独立实现）
- T066-T073: API 端点可并行（独立路由）

### Phase 4 (US2): Low Parallelism
- 依赖 US1 的队列和转换逻辑，但批量 API 可独立开发

### Phase 5 (US3): Low Parallelism
- 依赖 US1 的元数据收集器，但预览 API 可独立开发

---

## MVP Scope Recommendation

**最小可行产品 (MVP)**: 仅实施 **User Story 1 (Phase 3)**

**理由**:
- US1 是核心功能，提供端到端的 PPTX 转换能力
- 满足基本用户需求：上传 → 转换 → 下载
- 独立可测试，符合独立测试标准
- 可验证所有技术选型和架构决策

**MVP 任务列表**:
- Phase 1: 全部任务
- Phase 2: 全部任务
- Phase 3: 全部任务
- **跳过**: Phase 4, Phase 5（批量转换和预览功能）

**后续扩展**:
- 第二个迭代: 添加 US2（批量转换）
- 第三个迭代: 添加 US3（预览功能）
- 第四个迭代: Phase 6（性能优化和安全加固）

---

## Task Statistics

**Total Tasks**: 134

**By Phase**:
- Phase 1 (Setup): 15 tasks
- Phase 2 (Foundational): 19 tasks
- Phase 3 (US1): 47 tasks
- Phase 4 (US2): 8 tasks
- Phase 5 (US3): 12 tasks
- Phase 6 (Polish): 18 tasks

**By Type**:
- Setup/Configuration: 15
- Infrastructure: 19
- PPTX Parsing: 6
- Converters: 8
- API Endpoints: 18
- Error Handling: 6
- Observability: 14
- Testing: 10
- Documentation: 5
- Deployment: 4
- Polish: 19

**Parallelizable Tasks ([P] marker)**: ~85 tasks (63%)

---

## Validation Checklist

✅ **All tasks follow the checklist format**:
- Checkbox: `- [ ]`
- Task ID: T001-T134 (sequential)
- [P] marker: Applied for parallelizable tasks
- [Story] label: Applied for US1/US2/US3 phase tasks
- Description: Clear action with file path

✅ **Each user story is independently testable**:
- US1: T066-T073 提供完整的 API 端点
- US2: T097-T104 提供批量 API
- US3: T105-T107 提供预览 API

✅ **Dependencies clearly defined**:
- Foundational phase (Phase 2) must complete first
- US2 and US3 depend on US1 queue infrastructure
- Polish phase requires all user stories complete

✅ **MVP scope clearly identified**:
- Phase 1 + Phase 2 + Phase 3 = MVP
- Phases 4-5 = subsequent iterations

---

**Next Steps**:

1. **立即执行**: `/speckit.tasks` 已完成
2. **开始实施**: 从 Phase 1 开始，按顺序执行任务
3. **建议起点**: T001 → T015（项目初始化）
4. **验证进度**: 每完成一个 phase，运行相应测试验证功能

**Ready for Implementation! 🚀**
