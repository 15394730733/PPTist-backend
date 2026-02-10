# 安全政策

**版本**: v1.0.0
**更新日期**: 2025-01-29

---

## 目录

- [安全承诺](#安全承诺)
- [报告漏洞](#报告漏洞)
- [安全最佳实践](#安全最佳实践)
- [漏洞处理流程](#漏洞处理流程)
- [安全更新](#安全更新)
- [安全配置](#安全配置)

---

## 安全承诺

PPTist Backend 团队致力于维护项目和用户的安全。我们重视社区的安全研究人员在帮助我们发现和修复漏洞方面的贡献。

### 我们承诺

1. **及时响应**: 我们会在收到漏洞报告后 48 小时内确认收到
2. **透明沟通**: 我们会定期更新漏洞修复进度
3. **负责任披露**: 我们会协调公开披露的时间，确保用户有时间更新
4. **承认贡献**: 我们会在修复版本中致谢安全研究者的贡献

---

## 报告漏洞

### 如何报告

如果你发现了安全漏洞，**请不要通过公开 Issue 报告**。

**报告方式**:

1. **发送邮件**:
   - 📧 security@example.com
   - 📧 GitHub Security Advisory

2. **报告内容**:
   - 漏洞描述
   - 影响版本
   - 复现步骤
   - 潜在影响
   - 建议修复方案（如有）

3. **加密通信**:
   - 我们支持 PGP 加密
   - PGP Key: `0x1234567890ABCDEF`

### 报告期望

- **给予我们时间**: 请给予我们合理的时间来调查和修复问题
- **不恶意利用**: 请不要在公开披露前利用漏洞
- **保护用户**: 请避免披露可能危害用户的信息

---

## 安全最佳实践

### 开发安全

#### 1. 依赖管理

```bash
# 定期检查依赖漏洞
npm audit

# 检查过期依赖
npm outdated

# 更新依赖
npm update

# 锁定依赖版本
npm shrinkwrap
```

#### 2. 代码审查

- 所有代码变更必须经过审查
- 安全相关的变更需要双重审查
- 使用 ESLint 和 Prettier 进行代码检查

#### 3. 敏感信息处理

```typescript
// ❌ 错误 - 硬编码敏感信息
const API_KEY = 'sk-1234567890';

// ✅ 正确 - 使用环境变量
const API_KEY = process.env.API_KEY;

// ✅ 正确 - 日志脱敏
logger.info('User login', {
  userId: user.id,
  // 密码自动脱敏
  password: '[REDACTED]',
});
```

#### 4. 输入验证

```typescript
// 文件上传验证
import { validatePPTX } from './validators';

if (!await validatePPTX(file)) {
  throw new Error('Invalid file type');
}

// 参数验证
import { z } from 'zod';

const schema = z.object({
  taskId: z.string().uuid(),
  extractMedia: z.boolean().optional(),
});
```

### 部署安全

#### 1. 环境变量

```bash
# .env (不要提交到版本控制)
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# CORS 配置
ALLOWED_ORIGINS=https://example.com,https://app.example.com

# 速率限制
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# 文件上传限制
MAX_FILE_SIZE=104857600
```

#### 2. Docker 安全

```yaml
# docker-compose.yml
services:
  backend:
    image: pptist-backend:latest
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

#### 3. 网络安全

```nginx
# Nginx 反向代理配置
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 漏洞处理流程

### 严重性分级

| 级别 | 描述 | 响应时间 | 修复时间 |
|------|------|---------|---------|
| **严重** | 可远程执行代码、数据泄露 | 24 小时 | 48 小时 |
| **高危** | 需要用户交互的漏洞 | 48 小时 | 1 周 |
| **中危** | 影响有限的功能漏洞 | 1 周 | 2 周 |
| **低危** | 边缘情况的小问题 | 2 周 | 1 个月 |

### 处理步骤

```
[接收报告]
   ↓
[确认和分类] (48 小时内)
   ↓
[调查和修复] (根据严重性)
   ↓
[内部测试]
   ↓
[准备安全更新]
   ↓
[协调公开披露]
   ↓
[发布更新和公告]
```

### 修复和发布

1. **分支**: 创建安全修复分支 `security/fix-CVE-YYYY-XXXXX`
2. **修复**: 在分支中实施修复
3. **测试**: 全面测试修复方案
4. **发布**: 创建安全补丁版本
5. **公告**: 发布安全公告和升级指南

---

## 安全更新

### 接收更新

**订阅安全通知**:
- Watch GitHub Repository
- 订阅 Security Advisories
- 关注 Release Notes

### 验证更新

```bash
# 验证下载的文件
sha256sum pptist-backend-1.0.1.tgz

# 验证 GPG 签名
gpg --verify pptist-backend-1.0.1.tgz.asc
```

### 升级步骤

```bash
# 备份数据
docker-compose exec backend cp -r /data /backup

# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d

# 验证服务
curl https://api.example.com/health
```

---

## 安全配置

### CORS 配置

**开发环境**:
```typescript
// src/app.ts
app.register(fastifyCors, {
  origin: true,  // 允许所有源
  credentials: true,
});
```

**生产环境**:
```typescript
app.register(fastifyCors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://example.com',
    'https://app.example.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  maxAge: 86400,
});
```

### 速率限制

```typescript
// src/app.ts
app.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  allowList: ['127.0.0.1', '::1'],
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
});
```

### 文件上传限制

```typescript
// src/api/v1/controllers/convert.ts
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB

// 文件类型验证
const ALLOWED_TYPES = ['.pptx'];
const PPTX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

// 文件名清理
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\/\\]/g, '')        // 防止路径遍历
    .replace(/\.\./g, '')          // 防止目录遍历
    .replace(/[<>:"|?*]/g, '')     // 移除非法字符
    .substring(0, 255);           // 限制长度
}
```

### 日志脱敏

```typescript
// src/utils/logger.ts
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
];

function sanitize(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitize(value);
    }
  }

  return sanitized;
}
```

---

## 安全审计

### 定期审计

- **依赖审计**: 每月运行 `npm audit`
- **代码审查**: 每个季度进行安全代码审查
- **渗透测试**: 每年进行一次渗透测试
- **配置审计**: 每次部署前检查配置

### 审计工具

```bash
# 依赖漏洞扫描
npm audit
npm audit --audit-level=moderate

# 代码安全扫描
npx eslint . --ext .ts

# Docker 镜像扫描
docker scan pptist-backend:latest

# 敏感信息扫描
grep -r "password\|secret\|api_key" src/ --include="*.ts" -i
```

---

## 安全检查清单

### 开发阶段

- [ ] 代码经过审查
- [ ] 敏感信息使用环境变量
- [ ] 输入验证已实现
- [ ] 输出编码已实现
- [ ] 错误处理不暴露敏感信息
- [ ] 依赖版本已检查

### 部署阶段

- [ ] .env 文件已正确配置
- [ ] CORS 限制已设置
- [ ] 速率限制已启用
- [ ] HTTPS 已配置
- [ ] 安全响应头已启用
- [ ] Docker 安全选项已设置
- [ ] 资源限制已配置
- [ ] 日志轮转已配置

### 运维阶段

- [ ] 定期依赖更新
- [ ] 安全日志监控
- [ ] 异常行为告警
- [ ] 备份和恢复测试
- [ ] 安全审计定期执行
- [ ] 安全更新及时应用

---

## 安全资源

### 学习资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://github.com/lirantal/nodejs-security-best-practices)
- [TypeScript Security](https://typescript-eslint.io/rules/security/)

### 安全工具

- **npm audit** - 依赖漏洞扫描
- **Snyk** - 安全漏洞检测
- **Trivy** - 容器镜像扫描
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化

### 报告平台

- [GitHub Security Advisories](https://github.com/security/advisories)
- [HackerOne](https://www.hackerone.com/)
- [Bugcrowd](https://www.bugcrowd.com/)

---

## 联系方式

**安全相关事宜**:
- 📧 邮箱: security@example.com
- 🔐 PGP Key: `0x1234567890ABCDEF`
- 🐛 问题: [GitHub Security](https://github.com/yourusername/PPTist/security)

---

**感谢您帮助保护 PPTist Backend 和用户的安全！**

---

**文档维护**: PPTist Backend Team
**最后更新**: 2025-01-29
