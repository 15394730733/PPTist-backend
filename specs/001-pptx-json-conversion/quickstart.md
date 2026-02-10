# Quick Start Guide

**Feature**: PPTX to JSON Conversion
**Date**: 2026-01-24
**Target Audience**: 开发者

## Overview

本指南提供 PPTX 到 JSON 转换服务的快速上手说明，包括环境设置、依赖安装、本地运行和测试执行。

---

## Prerequisites

### 必需软件

- **Node.js**: 20.x LTS 或更高版本
- **npm**: 10.x 或更高版本
- **Git**: 版本控制
- **TypeScript**: 5.x（通过 npm 安装）

### 可选软件

- **Docker**: 容器化部署
- **Redis**: 任务队列扩展（可选）
- **Make**: 构建工具（可选）

---

## Installation

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/pptist-backend.git
cd pptist-backend
```

### 2. 安装依赖

```bash
npm install
```

**核心依赖**（自动安装）:
- `fastify`: Web 框架
- `fast-xml-parser`: XML 解析
- `yauzl`: ZIP 解压
- `fastq`: 内存队列
- `config`: 配置管理
- `zod`: 类型验证
- `pino`: 结构化日志
- `prom-client`: Prometheus 指标
- `vitest`: 测试框架

### 3. 安装 TypeScript 类型

```bash
npm install --save-dev @types/node @types/yauzl
```

---

## Configuration

### 1. 创建配置文件

**开发环境配置** (`config/development.yaml`):
```yaml
server:
  port: 3000
  host: "0.0.0.0"

taskQueue:
  type: "memory"              # 内存队列（默认）
  concurrency: 3               # 3 个并发任务
  resultRetentionHours: 24     # 结果保留 24 小时

fileProcessing:
  maxFileSize: 52428800        # 50MB
  base64Threshold: 1048576     # 1MB
  allowedExtensions: [".pptx"]

pptist:
  defaultVersion: "v1"
  supportedVersions: ["v1"]

logging:
  level: "debug"               # 开发环境使用 debug 级别
  format: "json"               # JSON 格式日志
  redact:
    - "fileProcessing.*"       # 脱敏文件路径

observability:
  metrics:
    enabled: true
    port: 9090
  tracing:
    enabled: false
```

**生产环境配置** (`config/production.yaml`):
```yaml
server:
  port: 8080

taskQueue:
  type: "redis"                # 生产环境使用 Redis（可选）
  concurrency: 10

redis:
  host: "${REDIS_HOST}"
  port: 6379
  password: "${REDIS_PASSWORD}"

logging:
  level: "info"                # 生产环境使用 info 级别

observability:
  metrics:
    enabled: true
  tracing:
    enabled: true
    endpoint: "http://jaeger:14268/api/traces"
```

### 2. 设置环境变量

**开发环境** (`.env`):
```bash
# 服务器配置
NODE_ENV=development
SERVER_PORT=3000

# 任务队列
QUEUE_TYPE=memory
QUEUE_CONCURRENCY=3

# 日志
LOG_LEVEL=debug
```

**生产环境** (`.env.production`):
```bash
NODE_ENV=production
SERVER_PORT=8080

# Redis（可选）
QUEUE_TYPE=redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# 日志
LOG_LEVEL=info
```

---

## Development

### 1. 启动开发服务器

```bash
npm run dev
```

**输出示例**:
```
[timestamp] INFO (12345): Server listening at http://localhost:3000
[timestamp] INFO (12345): Task queue type: memory
[timestamp] INFO (12345): Concurrency: 3
[timestamp] INFO (12345): Configuration loaded successfully
```

### 2. 验证服务健康

```bash
curl http://localhost:3000/api/v1/health
```

**预期响应**:
```json
{
  "status": "healthy",
  "version": "v1",
  "uptime": 0.5,
  "queue": {
    "type": "memory",
    "queued": 0,
    "processing": 0
  }
}
```

---

## Testing

### 1. 运行所有测试

```bash
npm test
```

### 2. 运行单元测试

```bash
npm run test:unit
```

### 3. 运行集成测试

```bash
npm run test:integration
```

### 4. 测试覆盖率

```bash
npm run test:coverage
```

**目标覆盖率**:
- 语句覆盖率: > 80%
- 分支覆盖率: > 75%
- 函数覆盖率: > 80%

---

## API Usage Examples

### 1. 上传 PPTX 文件并创建任务

```bash
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@/path/to/presentation.pptx" \
  -F "targetVersion=v1"
```

**响应**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "createdAt": "2026-01-24T10:30:00Z"
}
```

### 2. 查询任务状态

```bash
curl http://localhost:3000/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000
```

**响应**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "createdAt": "2026-01-24T10:30:00Z",
  "startedAt": "2026-01-24T10:30:01Z",
  "completedAt": "2026-01-24T10:30:05Z",
  "result": {
    "slides": [...],
    "metadata": {...},
    "pptistVersion": "v1"
  }
}
```

### 3. 下载转换结果（JSON）

```bash
curl -O http://localhost:3000/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/result
```

### 4. 下载转换结果（ZIP 包含媒体）

```bash
curl -O http://localhost:3000/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/result/zip
```

---

## Docker Deployment

### 1. 构建镜像

```bash
docker build -t pptist-converter:latest .
```

### 2. 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -p 9090:9090 \
  -e NODE_ENV=production \
  -e QUEUE_TYPE=memory \
  pptist-converter:latest
```

### 3. 使用 Docker Compose（推荐）

**`docker-compose.yml`**:
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
      - "9090:9090"
    environment:
      - NODE_ENV=production
      - QUEUE_TYPE=redis
      - REDIS_HOST=redis
    volumes:
      - ./config:/app/config:ro
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**启动服务**:
```bash
docker-compose up -d
```

---

## Monitoring

### 1. Prometheus 指标

访问 `http://localhost:9090/metrics` 查看 Prometheus 指标。

**关键指标**:
- `pptx_conversion_duration_seconds`: 转换耗时直方图
- `pptx_queue_size`: 队列长度仪表盘
- `pptx_errors_total`: 错误总数计数器
- `pptx_concurrent_tasks`: 当前并发任务数

### 2. 日志查看

**开发环境**（彩色输出）:
```bash
npm run dev
```

**生产环境**（JSON 格式）:
```bash
npm start | pino-pretty
```

**过滤日志**:
```bash
npm start | grep "taskId=550e8400-e29b-41d4-a716-446655440000"
```

---

## Troubleshooting

### 问题 1: 端口已被占用

**错误**: `Error: listen EADDRINUSE: address already in use ::3000`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 或使用其他端口
SERVER_PORT=3001 npm run dev
```

### 问题 2: 文件上传失败（文件过大）

**错误**: `413 Payload Too Large`

**解决方案**:
```yaml
# config/development.yaml
fileProcessing:
  maxFileSize: 104857600  # 增加到 100MB
```

### 问题 3: 内存不足

**错误**: `JavaScript heap out of memory`

**解决方案**:
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

## Project Structure

```
backend/
├── src/
│   ├── api/                 # API 层
│   │   ├── v1/              # API v1 版本
│   │   ├── middleware/      # 中间件
│   │   └── schemas/         # Zod schemas
│   ├── services/            # 业务逻辑
│   │   ├── conversion/      # 转换服务
│   │   ├── queue/           # 任务队列
│   │   └── storage/         # 存储服务
│   ├── models/              # 数据模型
│   ├── utils/               # 工具函数
│   ├── config/              # 配置管理
│   └── types/               # TypeScript 类型
├── tests/                   # 测试
│   ├── unit/
│   ├── integration/
│   └── fixtures/            # 测试数据
├── config/                  # 配置文件
├── specs/                   # 规格文档
└── package.json
```

---

## Next Steps

1. ✅ 环境设置完成
2. ⏭️ 阅读 [data-model.md](./data-model.md) 了解数据模型
3. ⏭️ 阅读 [contracts/api-v1.yaml](./contracts/api-v1.yaml) 了解 API 设计
4. ⏭️ 执行 `/speckit.tasks` 生成详细任务列表

---

## Resources

- **Fastify 文档**: https://fastify.dev/
- **项目仓库**: https://github.com/your-org/pptist-backend
- **问题追踪**: https://github.com/your-org/pptist-backend/issues

---

**Status**: ✅ Development Environment Ready
