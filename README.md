# PPTist Backend

<div align="center">

![PPTist Logo](https://img.shields.io/badge/PPTX-JSON%20Conversion-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D20.20-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![Fastify](https://img.shields.io/badge/fastify-5.0-black)
![License](https://img.shields.io/badge/license-MIT-green)

**PowerPoint PPTX → PPTist JSON 转换服务**

高性能、可靠的文件格式转换 API

[功能特性](#功能特性) • [快速开始](#快速开始) • [API 文档](#api-文档) •[部署指南](#部署指南)

</div>

---

## 📋 目录

- [项目概述](#项目概述)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [开发指南](#开发指南)
- [测试](#测试)
- [部署](#部署)
- [性能](#性能)
- [监控](#监控)
- [贡献](#贡献)

---

## 项目概述

PPTist Backend 是一个高性能的 PPTX 到 JSON 转换服务，用于将 PowerPoint PPTX 文件转换为 PPTist（Web 端 PPT 编辑器）可用的 JSON 格式。

### 主要功能

- ✅ **PPTX 文件解析**: 完整解析 PPTX 文件结构和内容
- ✅ **元素提取**: 提取文本、图像、形状、图表、表格等元素
- ✅ **格式转换**: 转换为 PPTist JSON 标准格式
- ✅ **异步处理**: 基于队列的异步任务处理
- ✅ **REST API**: 完整的 RESTful API 接口
- ✅ **Docker 支持**: 容器化部署，开箱即用

---

## 功能特性

### 🎯 核心转换功能

| 功能 | 描述 |
|------|------|
| **PPTX 解析** | 完整解析 PPTX 文件的 XML 结构 |
| **元素提取** | 支持文本、图片、形状、线条、图表、表格等 |
| **样式转换** | 保留元素样式和布局信息 |
| **元数据生成** | 自动生成转换元数据和统计信息 |
| **错误处理** | 健壮的错误处理和恢复机制 |
| **大文件支持** | 流式处理大文件，内存优化 |

### 🚀 API 特性

| 特性 | 说明 |
|------|------|
| **RESTful API** | 标准的 REST API 设计 |
| **文件上传** | 支持大文件上传（最大 100MB） |
| **异步任务** | 基于队列的异步转换处理 |
| **任务查询** | 查询转换任务状态和结果 |
| **Swagger 文档** | 自动生成的 API 文档 |
| **速率限制** | API 请求速率限制（100 req/min） |
| **CORS 支持** | 跨域资源共享配置 |

### 🔒 安全特性

| 特性 | 说明 |
|------|------|
| **文件验证** | 文件类型、大小、魔数验证 |
| **路径遍历防护** | 文件名清理和验证 |
| **敏感信息脱敏** | 日志自动脱敏 |
| **CORS 配置** | 环境感知的 CORS 策略 |
| **速率限制** | 防止 DDoS 攻击 |
| **安全响应头** | Helmet.js 安全头 |

---

## 技术栈

### 核心框架

- **Node.js** 20+ - JavaScript 运行时
- **TypeScript** 5.x - 类型安全
- **Fastify** 5.x - 高性能 Web 框架
- **Pino** 8.x - 结构化日志

### 主要依赖

- **yauzl** - ZIP 文件解析
- **fast-xml-parser** - XML 解析
- **fflate** - 文件压缩
- **prom-client** - Prometheus 指标
- **uuid** - 唯一生成
- **zod** - Schema 验证

### 开发工具

- **Vitest** - 单元测试框架
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **TypeScript** - 类型检查
- **Docker** - 容器化

---

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- npm >= 9.0.0
- Git

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/PPTist.git
cd PPTist/backend

# 安装依赖
npm install

# 构建项目
npm run build

# 启动服务
npm start
```

### 使用 Docker

```bash
# 构建镜像
docker build -t pptist-backend:latest .

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 快速测试

```bash
# 运行单元测试
npm run test:unit

# 运行 E2E 测试
npm run test:e2e

# 运行所有测试
npm test
```

---

## 项目结构

```
backend/
├── src/
│   ├── api/              # API 路由和控制器
│   │   └── v1/
│   │       ├── controllers/
│   │       └── index.ts
│   ├── app.ts           # Fastify 应用配置
│   ├── index.ts         # 应用入口
│   ├── types/           # TypeScript 类型定义
│   ├── models/          # 数据模型
│   ├── services/        # 业务服务
│   │   ├── conversion/  # 转换服务
│   │   ├── pptx/        # PPTX 处理
│   │   ├── queue/       # 任务队列
│   │   └── storage/     # 存储服务
│   ├── queue/           # 队列实现
│   ├── utils/           # 工具函数
│   └── middleware/     # 中间件
├── tests/              # 测试文件
│   ├── unit/          # 单元测试
│   ├── e2e/           # E2E 测试
│   └── fixtures/      # 测试数据
├── config/             # 配置文件
├── scripts/            # 脚本工具
├── docs/               # 文档
├── Dockerfile          # Docker 配置
├── docker-compose.yml  # Docker Compose 配置
└── package.json       # 项目配置
```

---

## API 文档

### 端点概览

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/v1/convert` | 上传并转换 PPTX 文件 |
| GET | `/api/v1/tasks/:id` | 查询任务状态 |
| GET | `/api/v1/tasks/:id/result` | 获取转换结果 |
| DELETE | `/api/v1/tasks/:id` | 删除任务 |
| GET | `/health` | 健康检查 |
| GET | `/metrics` | Prometheus 指标 |
| GET | `/docs` | Swagger 文档 |

### API 示例

#### 1. 转换 PPTX 文件

```bash
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@presentation.pptx" \
  -F "extractMedia=true" \
  -F "includeAnimations=true"
```

**响应**:
```json
{
  "success": true,
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "File uploaded successfully",
  "estimatedTime": 5000
}
```

#### 2. 查询任务状态

```bash
curl http://localhost:3000/api/v1/tasks/123e4567-e89b-12d3-a456-426614174000
```

**响应**:
```json
{
  "success": true,
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "processing",
    "progress": 50,
    "createdAt": "2025-01-29T12:00:00.000Z"
  }
}
```

#### 3. 获取转换结果

```bash
curl http://localhost:3000/api/v1/tasks/123e4567-e89b-12d3-a456-426614174000/result
```

**响应**:
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "presentation": {
      "width": 1280,
      "height": 720,
      "slides": [...]
    },
    "metadata": {...}
  }
}
```

### 完整 API 文档

查看完整 API 文档：
- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

---

## 开发指南

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件配置开发环境

### 开发模式

```bash
# 启动开发服务器（热重载）
npm run dev

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 自动修复代码格式
npm run lint:fix
```

### 构建生产版本

```bash
# 构建
npm run build

# 启动生产服务
NODE_ENV=production npm start
```

### 代码风格

项目使用 ESLint 和 Prettier 进行代码质量控制：

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

---

## 测试

### 运行测试

```bash
# 所有测试
npm test

# 单元测试
npm run test:unit

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

### 测试文件

- 单元测试: `tests/unit/**/*.test.ts`
- E2E 测试: `tests/e2e/**/*.test.ts`
- 测试数据: `tests/fixtures/`

### 测试覆盖率

当前测试覆盖率：
- 核心转换引擎: ✅ 已覆盖
- API 端点: ✅ 已覆盖
- 错误处理: ✅ 已覆盖

---

## 部署

### Docker 部署（推荐）

#### 快速启动

```bash
# 使用快速启动脚本
.\scripts\quick-start.ps1    # Windows
./scripts/quick-start.sh     # Linux/macOS
```

#### 完整部署

```bash
# 开发环境
.\scripts\deploy.ps1 dev up
./scripts/deploy.sh dev up

# 生产环境
.\scripts\deploy.ps1 prod up
./scripts/deploy.sh prod up
```

### 环境变量

主要环境变量（参见 `.env.example`）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | development | 运行环境 |
| `PORT` | 3000 | 服务端口 |
| `LOG_LEVEL` | info | 日志级别 |
| `QUEUE_TYPE` | memory | 队列类型 |
| `MAX_FILE_SIZE` | 104857600 | 最大文件大小（100MB） |
| `RATE_LIMIT_MAX` | 100 | 速率限制（请求数/分钟） |

### 生产部署检查清单

- [ ] 更新 `.env` 配置
- [ ] 设置生产级 CORS 源
- [ ] 配置反向代理（Nginx）
- [ ] 启用 HTTPS
- [ ] 配置进程管理器（PM2）
- [ ] 设置日志轮转
- [ ] 配置监控告警

---

## 性能

### 性能指标

| 指标 | 小文件 (<1MB) | 中文件 (1-10MB) | 大文件 (>10MB) |
|------|--------------|-----------------|---------------|
| 转换时间 | < 500ms | < 2s | < 10s |
| 吞吐量 | > 100 req/min | > 30 req/min | > 5 req/min |
| 内存使用 | < 100MB | < 500MB | < 1GB |

### 性能优化

- ✅ **流式处理**: 大文件分块处理
- ✅ **智能缓存**: LRU 缓存常见转换
- ✅ **异步队列**: 并发处理任务
- ✅ **内存优化**: 及时释放资源

### 性能基准测试

```bash
# 快速基准测试
npm run benchmark:quick

# 完整基准测试
npm run benchmark:full

# 并发测试
npm run benchmark:concurrent
```

---

## 监控

### Prometheus 指标

服务暴露以下指标：

- `http_requests_total` - HTTP 请求总数
- `http_request_duration_seconds` - 请求持续时间
- `conversions_total` - 转换任务总数
- `conversion_duration_seconds` - 转换持续时间
- `queue_size` - 队列大小
- `cache_hits_total` - 缓命中数

### 访问指标

```bash
# Prometheus 指标端点
curl http://localhost:9090/metrics

# Grafana 仪表板（开发环境）
http://localhost:3001
```

### 日志

日志文件位置：
- 控制台输出: 开发环境
- 文件输出: `logs/` 目录（生产环境）
- 日志轮转: 自动轮转，保留 14 天

---

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

### 开发流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 遵循 ESLint 规则
- 遵循 Prettier 格式
- 添加单元测试
- 更新文档

---

## 文档

更多文档：

- 📖 [API 文档](docs/API.md)
- 🏗️ [架构文档](docs/ARCHITECTURE.md)
- 🚀 [部署指南](DEPLOYMENT.md)
- 🔒 [安全政策](docs/SECURITY.md)
- 📋 [变更日志](CHANGELOG.md)

---

## 许可证

[MIT](LICENSE)

---

## 联系

- **Issues**: https://github.com/yourusername/PPTist/issues
- **Discussions**: https://github.com/yourusername/PPTist/discussions

---

<div align="center">

**Made with ❤️ by the PPTist Team**

</div>
