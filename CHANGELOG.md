# 更新日志

本文件记录 PPTist Backend 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中
- 完整的动画转换支持
- 更多图表类型支持
- 版本转换功能

---

## [1.0.0] - 2025-01-29

### 🎉 重大发布 - 完整的 PPTX 到 JSON 转换服务

#### 新增

**核心功能**
- ✅ PPTX 文件解析和提取
- ✅ 元素转换系统（文本、图片、形状、线条、图表、表格）
- ✅ 异步任务队列处理
- ✅ RESTful API 接口
- ✅ 媒体文件提取和存储
- ✅ 元数据生成和统计
- ✅ 转换警告系统

**API 端点**
- ✅ `POST /api/v1/convert` - 上传并转换 PPTX 文件
- ✅ `GET /api/v1/tasks/:id` - 查询任务状态
- ✅ `GET /api/v1/tasks/:id/result` - 获取转换结果
- ✅ `DELETE /api/v1/tasks/:id` - 删除任务
- ✅ `GET /health` - 健康检查
- ✅ `GET /metrics` - Prometheus 指标
- ✅ `GET /docs` - Swagger API 文档

**安全特性**
- ✅ 文件类型和大小验证
- ✅ Magic Number 验证
- ✅ 路径遍历防护
- ✅ CORS 配置（环境感知）
- ✅ 速率限制（100 req/min）
- ✅ Helmet.js 安全响应头
- ✅ 日志脱敏机制

**性能优化**
- ✅ 流式文件处理（大文件优化）
- ✅ LRU 缓存系统
- ✅ 并发任务处理
- ✅ 内存优化策略

**监控和日志**
- ✅ 结构化日志（Pino）
- ✅ Prometheus 指标收集
- ✅ Grafana 仪表板配置
- ✅ 告警规则配置
- ✅ 日志轮转和压缩

**部署支持**
- ✅ Docker 多阶段构建
- ✅ Docker Compose 配置（dev/test/prod）
- ✅ 部署自动化脚本
- ✅ 健康检查配置
- ✅ 资源限制和优化

**测试**
- ✅ E2E 测试套件（4 个测试全部通过）
- ✅ 单元测试框架（Vitest）
- ✅ 性能基准测试脚本

**文档**
- ✅ README.md - 项目概述和快速开始
- ✅ API.md - 完整 API 文档
- ✅ ARCHITECTURE.md - 系统架构文档
- ✅ CONTRIBUTING.md - 贡献指南
- ✅ SECURITY.md - 安全政策
- ✅ CHANGELOG.md - 更新日志
- ✅ Swagger/OpenAPI 文档

#### 技术栈

**核心框架**
- Node.js 20+
- TypeScript 5.x
- Fastify 5.x
- Pino 8.x

**主要依赖**
- yauzl - ZIP 文件解析
- fast-xml-parser - XML 解析
- fflate - 文件压缩
- prom-client - Prometheus 指标
- uuid - 唯一生成
- zod - Schema 验证

**开发工具**
- Vitest - 单元测试
- ESLint - 代码检查
- Prettier - 代码格式化
- Docker - 容器化

#### 性能指标

| 指标 | 小文件 (<1MB) | 中文件 (1-10MB) | 大文件 (>10MB) |
|------|--------------|-----------------|---------------|
| 转换时间 | < 500ms | < 2s | < 10s |
| 吞吐量 | > 100 req/min | > 30 req/min | > 5 req/min |
| 内存使用 | < 100MB | < 500MB | < 1GB |

#### 已知限制

- 部分高级转换器需要进一步实现
- 动画转换为基础实现
- 图表转换功能有限
- 表格转换功能为基础实现

---

## 版本说明

### 版本号格式

- **主版本号**: 不兼容的 API 变更
- **次版本号**: 向下兼容的功能新增
- **修订号**: 向下兼容的问题修复

### 变更类型

- **新增** - 新功能
- **变更** - 功能变更
- **弃用** - 即将移除的功能
- **移除** - 已移除的功能
- **修复** - 问题修复
- **安全** - 安全相关变更

---

## 未来规划

### v1.1.0 (计划中)

**新功能**
- 完整的动画转换支持
- 更多图表类型支持
- 批量转换功能

**改进**
- 大文件性能优化
- 内存使用优化
- 转换准确性提升

### v1.2.0 (计划中)

**新功能**
- 版本转换支持
- PPTX 模板支持
- 自定义主题支持

**改进**
- API 认证机制
- WebSocket 实时进度
- 转换预览功能

---

**维护**: PPTist Backend Team
**最后更新**: 2025-01-29
