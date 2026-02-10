# PPTist Backend 部署指南

本文档提供了 PPTX 到 JSON 转换服务的完整部署指南。

## 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [部署方式](#部署方式)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)
- [维护操作](#维护操作)

---

## 前置要求

### 必需软件

- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0
- **Node.js**: >= 20.0 (用于本地开发)
- **Git**: 用于克隆仓库

### 系统要求

- **CPU**: 最小 2 核，推荐 4 核
- **内存**: 最小 2GB，推荐 4GB
- **磁盘**: 最小 10GB 可用空间

### 端口需求

- **3000**: 主 API 服务
- **9090**: Prometheus 指标端点（可选）
- **6379**: Redis（如果使用 Redis 队列）
- **9091**: Prometheus UI（开发环境）
- **3001**: Grafana UI（开发环境）

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/PPTist.git
cd PPTist/backend
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用您喜欢的编辑器
```

### 3. 启动服务

#### 使用 Shell 脚本（Linux/macOS）

```bash
# 给脚本添加执行权限
chmod +x scripts/deploy.sh

# 启动开发环境
./scripts/deploy.sh dev up

# 查看日志
./scripts/deploy.sh dev logs

# 检查健康状态
./scripts/deploy.sh dev health
```

#### 使用 PowerShell 脚本（Windows）

```powershell
# 启动开发环境
.\scripts\deploy.ps1 dev up

# 查看日志
.\scripts\deploy.ps1 dev logs

# 检查健康状态
.\scripts\deploy.ps1 dev health
```

#### 使用 Docker Compose

```bash
# 开发环境
docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

# 生产环境
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d

# 测试环境
docker-compose -f docker-compose.base.yml -f docker-compose.test.yml up
```

### 4. 验证部署

```bash
# 健康检查
curl http://localhost:3000/health

# 查看 API 文档
open http://localhost:3000/docs
```

---

## 环境配置

### 开发环境（dev）

适合本地开发和调试：

```bash
# 启动开发环境（包含热重载、调试器、Grafana）
./scripts/deploy.sh dev up
```

**特性：**
- 代码热重载
- Node.js 调试器（端口 9229）
- 详细的日志输出
- Grafana 仪表板（端口 3001）
- Prometheus 指标（端口 9091）

### 测试环境（test）

运行自动化测试：

```bash
# 运行测试套件
./scripts/deploy.sh test up

# 查看测试结果
docker logs pptist-test-runner
```

### 生产环境（prod）

生产级部署配置：

```bash
# 启动生产环境
./scripts/deploy.sh prod up
```

**特性：**
- 资源限制（CPU、内存）
- 只读文件系统
- 安全增强
- 日志轮转
- 自动重启

---

## 环境变量说明

### 核心配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3000` | 服务端口 |
| `HOST` | `0.0.0.0` | 监听地址 |

### 队列配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `QUEUE_TYPE` | `memory` | 队列类型：`memory` 或 `redis` |
| `QUEUE_CONCURRENCY` | `5` | 并发处理任务数 |
| `QUEUE_MAX_SIZE` | `1000` | 队列最大长度 |
| `QUEUE_TIMEOUT` | `300000` | 任务超时（毫秒） |

### Redis 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `REDIS_HOST` | `redis` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | - | Redis 密码（建议生产环境设置） |
| `REDIS_MAXMEMORY` | `512mb` | Redis 最大内存 |

### 日志配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LOG_LEVEL` | `info` | 日志级别：`error`、`warn`、`info`、`debug` |
| `LOG_FORMAT` | `json` | 日志格式：`json` 或 `pretty` |

### 安全配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `MAX_FILE_SIZE` | `104857600` | 最大文件大小（字节，默认 100MB） |
| `ALLOWED_ORIGINS` | `*` | 允许的 CORS 源 |
| `RATE_LIMIT_MAX` | `100` | 速率限制：最大请求数 |
| `RATE_LIMIT_WINDOW` | `60000` | 速率限制：时间窗口（毫秒） |

---

## 监控与日志

### 健康检查

服务提供 `/health` 端点用于健康检查：

```bash
curl http://localhost:3000/health
```

**响应示例：**

```json
{
  "status": "ok",
  "timestamp": "2025-01-29T12:00:00.000Z",
  "uptime": 123456.789,
  "version": "1.0.0"
}
```

### 查看日志

```bash
# 查看所有日志
./scripts/deploy.sh prod logs

# 查看特定服务的日志
docker logs -f pptist-backend-prod

# 查看最近 100 行日志
docker logs --tail 100 pptist-backend-prod
```

### Prometheus 指标

Prometheus 端点：`http://localhost:9090/metrics`

**可用指标：**

- `http_requests_total`: HTTP 请求总数
- `http_request_duration_seconds`: 请求处理时间
- `conversion_tasks_total`: 转换任务总数
- `conversion_tasks_duration_seconds`: 转换任务处理时间
- `queue_size`: 当前队列大小
- `queue_processing`: 正在处理的任务数

### Grafana 仪表板

开发环境提供 Grafana 仪表板：

```bash
# 启动开发环境
./scripts/deploy.sh dev up

# 访问 Grafana
open http://localhost:3001
```

**默认凭据：**
- 用户名: `admin`
- 密码: `admin`

---

## 故障排查

### 常见问题

#### 1. 服务无法启动

**症状：** 容器启动失败或立即退出

**解决方案：**

```bash
# 查看容器日志
docker logs pptist-backend-prod

# 检查配置文件
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml config

# 验证环境变量
docker-compose exec app env | sort
```

#### 2. 健康检查失败

**症状：** `/health` 端点无响应或返回错误

**解决方案：**

```bash
# 运行健康检查脚本
./scripts/health-check.sh

# 手动测试端点
docker-compose exec app wget -O- http://localhost:3000/health

# 检查服务状态
docker-compose ps
```

#### 3. 转换任务失败

**症状：** 文件上传成功但转换失败

**解决方案：**

```bash
# 查看应用日志
docker logs pptist-backend-prod | grep -i error

# 检查磁盘空间
df -h

# 检查内存使用
docker stats pptist-backend-prod

# 验证临时目录权限
docker-compose exec app ls -lah /app/temp
```

#### 4. 性能问题

**症状：** 响应时间过长或超时

**解决方案：**

```bash
# 增加并发数
# 编辑 .env: QUEUE_CONCURRENCY=10

# 增加 Node.js 内存
# 编辑 .env: NODE_OPTIONS=--max-old-space-size=4096

# 检查队列状态
curl http://localhost:3000/api/v1/tasks/stats
```

### 日志分析

```bash
# 查找错误日志
docker logs pptist-backend-prod 2>&1 | grep -i error

# 查找警告日志
docker logs pptist-backend-prod 2>&1 | grep -i warn

# 统计错误数量
docker logs pptist-backend-prod 2>&1 | grep -c error

# 查看最近 10 分钟的日志
docker logs --since 10m pptist-backend-prod
```

---

## 维护操作

### 更新服务

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 停止当前服务
./scripts/deploy.sh prod down

# 3. 重新构建镜像
./scripts/deploy.sh prod build

# 4. 启动新服务
./scripts/deploy.sh prod up

# 5. 验证更新
./scripts/deploy.sh prod health
```

### 清理资源

```bash
# 清理停止的容器
docker container prune -f

# 清理未使用的镜像
docker image prune -a -f

# 清理未使用的卷
docker volume prune -f

# 清理所有未使用的资源
./scripts/deploy.sh prod clean
```

### 备份与恢复

#### 备份

```bash
# 备份环境变量
cp .env .env.backup.$(date +%Y%m%d)

# 备份存储卷
docker run --rm -v pptist-storage-prod:/data -v $(pwd):/backup \
  alpine tar czf /backup/storage-backup-$(date +%Y%m%d).tar.gz -C /data .

# 备份 Redis 数据
docker run --rm -v pptist-redis-prod:/data -v $(pwd):/backup \
  alpine tar czf /backup/redis-backup-$(date +%Y%m%d).tar.gz -C /data .
```

#### 恢复

```bash
# 恢复环境变量
cp .env.backup.20250129 .env

# 恢复存储卷
docker run --rm -v pptist-storage-prod:/data -v $(pwd):/backup \
  alpine tar xzf /backup/storage-backup-20250129.tar.gz -C /data

# 恢复 Redis 数据
docker run --rm -v pptist-redis-prod:/data -v $(pwd):/backup \
  alpine tar xzf /backup/redis-backup-20250129.tar.gz -C /data
```

### 性能优化

#### 调整资源限制

编辑 `.env` 文件：

```bash
# 应用服务资源
DOCKER_CPUS=4
DOCKER_MEMORY=4G

# Redis 资源
REDIS_MEMORY=1G
```

#### 启用 Redis 队列

```bash
# 编辑 .env
QUEUE_TYPE=redis
REDIS_HOST=redis
REDIS_PORT=6379
```

#### 调整并发级别

```bash
# 编辑 .env
QUEUE_CONCURRENCY=10
UV_THREADPOOL_SIZE=8
```

---

## 安全建议

### 生产环境检查清单

- [ ] 修改默认密码（Redis、Grafana）
- [ ] 配置防火墙规则
- [ ] 启用 HTTPS
- [ ] 限制 CORS 源
- [ ] 配置速率限制
- [ ] 启用日志聚合
- [ ] 设置监控告警
- [ ] 定期备份数据
- [ ] 使用密钥管理服务
- [ ] 定期更新依赖

### 密码管理

使用 Docker secrets 或环境变量管理敏感信息：

```bash
# 不要在 .env 中硬编码密码
# 使用环境变量或密钥管理系统

REDIS_PASSWORD=$(openssl rand -base64 32)
```

### 网络安全

```bash
# 限制容器间通信
docker network create --driver bridge --internal pptist-network

# 使用自定义网络
# 在 docker-compose.yml 中配置
```

---

## 支持

如有问题，请联系：

- **Email**: support@example.com
- **Issues**: https://github.com/yourusername/PPTist/issues
- **文档**: https://github.com/yourusername/PPTist/wiki
