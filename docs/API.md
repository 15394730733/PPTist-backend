# API 文档

**版本**: v1.0.0
**基础路径**: `/api/v1`
**协议**: HTTP/HTTPS

---

## 目录

- [概述](#概述)
- [认证](#认证)
- [通用响应格式](#通用响应格式)
- [API 端点](#api-端点)
- [错误代码](#错误代码)
- [速率限制](#速率限制)

---

## 概述

PPTist Backend API 提供了 PPTX 到 PPTist JSON 转换服务。所有端点都返回 JSON 格式的响应。

### 基础 URL

```
开发环境: http://localhost:3000
生产环境: https://api.example.com
```

### 内容类型

```
Content-Type: application/json
Accept: application/json
```

---

## 认证

当前版本不需要认证。未来版本将支持 API Key 认证。

---

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

---

## API 端点

### 1. 文件转换

#### 上传并转换 PPTX 文件

**端点**: `POST /api/v1/convert`

**请求**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: 表单数据

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `file` | File | ✅ | PPTX 文件（最大 100MB） |
| `extractMedia` | boolean | ❌ | 是否提取媒体文件（默认: true） |
| `includeAnimations` | boolean | ❌ | 是否包含动画（默认: true） |
| `includeNotes` | boolean | ❌ | 是否包含备注（默认: true） |

**示例请求**:

```bash
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@presentation.pptx" \
  -F "extractMedia=true" \
  -F "includeAnimations=true"
```

**成功响应** (202 Accepted):

```json
{
  "success": true,
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File uploaded successfully",
  "estimatedTime": 5000,
  "queuePosition": 0
}
```

**错误响应** (400 Bad Request):

```json
{
  "success": false,
  "error": "Invalid file type. Only .pptx files are supported.",
  "code": "INVALID_FILE_TYPE"
}
```

**状态码**:
- `202 Accepted` - 文件已接受，正在处理
- `400 Bad Request` - 请求参数错误
- `413 Payload Too Large` - 文件超过大小限制
- `415 Unsupported Media Type` - 不支持的文件类型

---

### 2. 查询任务状态

#### 获取转换任务状态

**端点**: `GET /api/v1/tasks/:id`

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID（UUID） |

**示例请求**:

```bash
curl http://localhost:3000/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress": 100,
    "result": {
      "version": "1.0.0",
      "width": 1280,
      "height": 720,
      "slides": [...]"
    },
    "metadata": {
      "slideCount": 5,
      "elementCount": 25,
      "hasMedia": true,
      "processingDuration": 3500
    },
    "warnings": [],
    "createdAt": "2025-01-29T12:00:00.000Z",
    "updatedAt": "2025-01-29T12:00:03.500Z"
  }
}
```

**任务状态**:
- `queued` - 排队中
- `processing` - 处理中
- `completed` - 已完成
- `failed` - 失败

**状态码**:
- `200 OK` - 任务存在
- `404 Not Found` - 任务不存在

---

### 3. 获取转换结果

#### 获取转换结果

**端点**: `GET /api/v1/tasks/:id/result`

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID（UUID） |

**示例请求**:

```bash
curl http://localhost:3000/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/result
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "presentation": {
      "width": 1280,
      "height": 720,
      "slides": [
        {
          "id": "slide_1",
          "elements": [...]
        }
      ]
    },
    "metadata": {
      "sourceFilename": "presentation.pptx",
      "slideCount": 1,
      "elementCount": 5,
      "processingDuration": 2500
    }
  }
}
```

**状态码**:
- `200 OK` - 结果存在
- `404 Not Found` - 结果不存在或任务未完成
- `410 Gone` - 结果已过期

---

### 4. 删除任务

#### 删除转换任务

**端点**: `DELETE /api/v1/tasks/:id`

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID（UUID） |

**示例请求**:

```bash
curl -X DELETE http://localhost:3000/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

**状态码**:
- `200 OK` - 删除成功
- `404 Not Found` - 任务不存在

---

### 5. 健康检查

#### 服务健康状态

**端点**: `GET /health`

**示例请求**:

```bash
curl http://localhost:3000/health
```

**响应** (200 OK):

```json
{
  "status": "ok",
  "timestamp": "2025-01-29T12:00:00.000Z",
  "uptime": 123456.789,
  "version": "1.0.0",
  "queue": {
    "queued": 0,
    "processing": 1,
    "completed": 100
  }
}
```

---

### 6. Prometheus 指标

#### Prometheus 指标端点

**端点**: `GET /metrics`

**内容类型**: `text/plain`

**示例请求**:

```bash
curl http://localhost:3000/metrics
```

**可用指标**:

```
# HTTP 请求
http_requests_total{method, route, status_code}
http_request_duration_seconds{method, route}

# 转换任务
conversions_total{status}
conversion_duration_seconds{status, file_size_range}
pptx_conversion_file_size_bytes

# 队列
pptx_conversion_queue_length{state}

# 缓存
cache_hits_total{cache_type}
cache_misses_total{cache_type}
```

---

### 7. Swagger 文档

#### API 文档 UI

**端点**: `GET /docs`

**浏览器访问**: http://localhost:3000/docs

提供交互式 API 文档，支持：
- 在线测试 API
- 查看 Schema 定义
- 生成代码示例

---

## 错误代码

| 错误代码 | HTTP 状态码 | 描述 |
|---------|-----------|------|
| `INVALID_FILE_TYPE` | 400 | 不支持的文件类型 |
| `FILE_TOO_LARGE` | 413 | 文件超过大小限制 |
| `MISSING_FILE` | 400 | 未上传文件 |
| `TASK_NOT_FOUND` | 404 | 任务不存在 |
| `RESULT_NOT_READY` | 404 | 结果未准备好或已过期 |
| `CONVERSION_FAILED` | 500 | 转换处理失败 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超过速率限制 |
| `INTERNAL_ERROR` | 500 | 内部服务器错误 |

---

## 速率限制

API 实施速率限制以防止滥用：

- **限制**: 100 请求/分钟/IP
- **窗口**: 1 分钟
- **白名单**: `127.0.0.1`, `::1`（本地地址）

### 响应头

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640876980
```

### 超限响应

**状态码**: `429 Too Many Requests`

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": "1 minute"
}
```

---

## 文件上传限制

### 文件大小

- **最大**: 100 MB
- **推荐**: < 50 MB

### 文件类型

- **支持**: `.pptx`
- **检测**: 基于 Magic Number 和文件扩展名

### 魾名验证

PPTX 文件的 Magic Number（前 4 字节）:
```
50 4b 03 04
```

---

## SDK 和客户端示例

### cURL

```bash
# 转换文件
curl -X POST http://localhost:3000/api/v1/convert \
  -F "file=@presentation.pptx" \
  -F "extractMedia=true"

# 查询状态
curl http://localhost:3000/api/v1/tasks/{taskId}

# 获取结果
curl http://localhost:3000/api/v1/tasks/{taskId}/result
```

### JavaScript / TypeScript

```typescript
import fs from 'fs';
import FormData from 'form-data';

// 上传文件
const formData = new FormData();
formData.append('file', fs.createReadStream('presentation.pptx'));
formData.append('extractMedia', 'true');

const response = await fetch('http://localhost:3000/api/v1/convert', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log('Task ID:', result.taskId);

// 查询状态
const statusResponse = await fetch(
  `http://localhost:3000/api/v1/tasks/${result.taskId}`
);
const status = await statusResponse.json();
console.log('Status:', status.task.status);
```

### Python

```python
import requests

# 上传文件
with open('presentation.pptx', 'rb') as f:
    files = {'file': f}
    data = {'extractMedia': 'true'}
    response = requests.post(
        'http://localhost:3000/api/v1/convert',
        files=files,
        data=data
    )
result = response.json()
task_id = result['taskId']

# 查询状态
response = requests.get(
    f'http://localhost:3000/api/v1/tasks/{task_id}'
)
status = response.json()
print('Status:', status['task']['status'])
```

---

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本历史。

---

## 支持

- **文档**: [README.md](README.md)
- **问题**: https://github.com/yourusername/PPTist/issues
- **讨论**: https://github.com/yourusername/PPTist/discussions
