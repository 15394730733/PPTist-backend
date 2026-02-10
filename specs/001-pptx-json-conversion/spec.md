# Feature Specification: PPTX to JSON Conversion

**Feature Branch**: `001-pptx-json-conversion`
**Created**: 2026-01-23
**Status**: Draft
**Input**: User description: "我想讲pptx格式的文件完整的转换成json格式输出,转换出来的json文件最好可以导入到../PPTist工程里正常运行"

## Clarifications

### Session 2026-01-24

- Q: (Integration & External Dependencies) 转换后的 JSON 如何交付给用户/PPTist? → A: 通过 REST API 直接返回 JSON 数据，用户检查通过后可选择下载为 JSON 文件，同时为后续自动化导入 PPTist 项目预留扩展接口
- Q: (Security & Privacy) API 需要什么级别的身份认证和授权? → A: 无需认证，完全开放的公开 API（适合内部工具/开发环境使用）
- Q: (Domain & Data Model + Performance) PPTX 中的媒体资源（图片、音频、视频）应如何存储和引用? → A: 小文件（<1MB）转换为 base64 嵌入 JSON，大文件提取为独立文件，JSON 中通过相对路径或文件名引用
- Q: (Performance + Scalability) 系统应如何支持批量转换和并发处理? → A: 使用异步任务队列架构，支持后台处理和进度查询，可处理多个并发转换任务
- Q: (Observability) 系统应提供什么级别的日志、监控和追踪能力? → A: 完整可观测性栈（结构化 JSON 日志 + Prometheus 指标 + 分布式追踪）
- Q: (Scalability) 任务队列存储应如何选择以平衡当前简单性和未来可扩展性? → A: 初期使用内存队列，但通过接口抽象层实现可插拔架构，确保后续可无缝切换至 Redis 队列
- Q: (Extensibility & Compatibility) 当 PPTist 数据结构演进时，转换器应如何保持兼容性? → A: 实现版本化转换器，支持多个 PPTist 版本，通过 API 参数或配置选择目标版本
- Q: (Configuration & Deployment) 系统应如何管理不同环境的配置? → A: 使用配置文件（YAML/JSON）+ 环境变量覆盖，支持 12-factor app 标准和容器化部署
- Q: (Extensibility) 如何支持未来添加新的元素类型转换器? → A: 实现策略模式 + 转换器注册表，核心支持常见元素，自定义转换器可通过注册机制扩展
- Q: (API Extensibility) API 本身应如何版本控制以支持未来演进? → A: 使用 URI 路径版本控制（如 `/api/v1/convert`），保持多版本并存，确保向后兼容

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 上传并转换 PPTX 文件 (Priority: P1)

用户上传一个 PPTX 格式的 PowerPoint 文件,系统将其完整转换为符合 PPTist 数据结构的 JSON 格式,并返回可下载的 JSON 文件或直接提供 JSON 数据。

**Why this priority**: 这是核心功能,用户需要将现有的 PPTX 文件转换为 PPTist 可识别的格式以便在线编辑和查看。没有这个功能,用户无法使用已有的 PPT 资源。

**Independent Test**: 可以独立测试 - 上传一个真实的 PPTX 文件,验证输出的 JSON 文件可以成功导入到 PPTist 前端项目中并正确渲染显示所有幻灯片内容。

**Acceptance Scenarios**:

1. **Given** 用户有一个包含多张幻灯片的 PPTX 文件, **When** 用户通过 REST API 上传该文件, **Then** 系统返回任务 ID 并立即开始异步处理转换
2. **Given** 用户收到任务 ID, **When** 用户轮询查询任务状态, **Then** 系统返回任务状态(处理中/成功/失败)和进度信息
3. **Given** 转换任务成功完成, **When** 任务状态为成功, **Then** 用户可通过 API 获取符合 PPTist `Slide` 类型的 JSON 数据,包含所有幻灯片、元素、样式和动画信息
4. **Given** 用户检查 JSON 数据确认无误, **When** 用户请求下载 JSON 文件, **Then** 系统提供可直接下载的 .json 文件(或包含媒体文件的 ZIP 压缩包)
5. **Given** PPTX 文件包含文本、图片、形状、表格等元素, **When** 转换完成, **Then** JSON 输出中所有元素都被正确映射到对应的 PPTist 元素类型(PPTTextElement, PPTImageElement, PPTShapeElement 等)
6. **Given** PPTX 文件包含自定义字体和颜色, **When** 转换完成, **Then** JSON 输出保留所有字体名称、颜色值、渐变等样式属性
7. **Given** 上传的文件损坏或不是有效的 PPTX 格式, **When** 系统尝试解析, **Then** 任务状态标记为失败,返回清晰的错误信息说明文件无效的具体原因

---

### User Story 2 - 批量转换 PPTX 文件 (Priority: P2)

用户一次性上传多个 PPTX 文件,系统为每个文件创建独立的转换任务,支持并发处理,并提供批量任务状态查询。

**Why this priority**: 对于有大量 PPT 文件需要迁移到 PPTist 的用户,批量转换能大幅提升效率,任务队列架构允许并发处理多个文件,避免串行等待。

**Independent Test**: 可以独立测试 - 同时上传 3-5 个不同的 PPTX 文件,验证每个文件都成功创建独立的转换任务,可通过任务 ID 查询各自状态和获取结果。

**Acceptance Scenarios**:

1. **Given** 用户选择 5 个有效的 PPTX 文件, **When** 批量上传, **Then** 系统为每个文件创建独立的转换任务,返回 5 个对应的任务 ID
2. **Given** 用户获得 5 个任务 ID, **When** 查询批量任务状态, **Then** 系统返回所有任务的汇总状态(已完成/处理中/失败的数量)
3. **Given** 批量上传中有一个文件损坏, **When** 系统处理, **Then** 其他有效文件的任务正常处理,损坏文件的任务标记为失败并返回明确错误信息,不影响其他任务
4. **Given** 用户上传 10 个文件, **When** 转换处理, **Then** 系统通过任务队列并发处理多个任务,在合理时间内完成(例如 60 秒内)并可通过进度查询了解当前状态

---

### User Story 3 - 转换结果验证与预览 (Priority: P3)

用户上传 PPTX 文件后,系统提供转换后的 JSON 结构预览,允许用户在下载前验证关键信息(幻灯片数量、元素统计、可能的转换警告)。

**Why this priority**: 提供透明度和信任度,让用户了解转换是否完整,哪些元素可能无法完美转换,帮助用户决定是否需要手动调整。

**Independent Test**: 可以独立测试 - 上传一个 PPTX 文件,查看返回的元数据信息,确认幻灯片数量、元素类型统计等信息准确。

**Acceptance Scenarios**:

1. **Given** 用户上传一个包含 10 张幻灯片的 PPTX, **When** 转换完成, **Then** 系统返回元数据包括:幻灯片总数、各类型元素数量统计、转换警告列表(如"3 个特殊形状已转为图片")
2. **Given** PPTX 中包含 PPTist 不支持的元素, **When** 转换完成, **Then** 系统在警告中明确标注哪些元素被降级处理或移除
3. **Given** 用户查看预览信息, **When** 确认无误, **Then** 可以直接下载 JSON 文件或获取 JSON 数据

---

### Edge Cases

- 当 PPTX 文件超过 100MB 时会发生什么? (系统应拒绝并提示文件过大)
- 当 PPTX 使用加密或密码保护时如何处理? (返回明确错误,说明需要先解除密码保护)
- 当 PPTX 包含 PPTist 不支持的 SmartArt、3D 模型等高级元素时如何处理? (降级为图片或在 JSON 中标注为不支持的元素)
- 当 PPTX 的媒体文件(图片、视频、音频)使用外部链接而非嵌入时如何处理? (尝试下载嵌入,失败则保留原始 URL)
- 当 PPTX 使用自定义 XML 或扩展属性时如何处理? (忽略未知属性,保留核心数据)
- 当转换过程中内存不足时如何处理? (优雅降级,返回部分结果或清晰错误,不崩溃)
- 当 PPTX 包含宏(VBA)或 ActiveX 控件时如何处理? (忽略宏代码,保留静态可视化元素)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 能够解析 PPTX 文件的内部 XML 结构(Office Open XML 格式)
- **FR-002**: 系统 MUST 将 PPTX 中的幻灯片映射为 PPTist 的 `Slide` 接口结构
- **FR-003**: 系统 MUST 将 PPTX 中的文本框转换为 `PPTTextElement` 类型,保留内容、字体、颜色、对齐方式
- **FR-004**: 系统 MUST 将 PPTX 中的图片转换为 `PPTImageElement` 类型,对于小于 1MB 的图片转换为 base64 嵌入 JSON,大于等于 1MB 的图片提取为独立文件并在 JSON 中引用文件路径
- **FR-005**: 系统 MUST 将 PPTX 中的形状转换为 `PPTShapeElement` 类型,保留路径、填充、边框、阴影属性
- **FR-006**: 系统 MUST 将 PPTX 中的线条转换为 `PPTLineElement` 类型,保留起点、终点、样式
- **FR-007**: 系统 MUST 将 PPTX 中的图表转换为 `PPTChartElement` 类型,提取数据系列、标签、图例
- **FR-008**: 系统 MUST 将 PPTX 中的表格转换为 `PPTTableElement` 类型,保留单元格内容、样式、合并信息
- **FR-009**: 系统 MUST 保留幻灯片背景设置(纯色、渐变、图片),映射为 `SlideBackground` 结构
- **FR-010**: 系统 MUST 提取幻灯片切换动画并映射为 `turningMode` 属性
- **FR-011**: 系统 MUST 提取元素动画并映射为 `PPTAnimation` 结构(尽可能保留)
- **FR-012**: 系统 MUST 保留页面级别的备注(Notes)和备注(Remark)信息
- **FR-013**: 系统 MUST 为每个元素生成唯一 ID,符合 PPTist 的 ID 格式要求
- **FR-014**: 系统 MUST 计算元素的准确位置(left, top)和尺寸(width, height),基于 PPTX 的坐标系
- **FR-015**: 系统 MUST 处理元素的层级关系(z-index),确保正确的渲染顺序
- **FR-016**: 系统 MUST 支持 PPTX 中的组合(Groups)元素,映射为 PPTist 的 `groupId` 属性
- **FR-017**: 系统 MUST 将颜色值转换为 CSS 支持的格式(十六进制、rgb、rgba)
- **FR-018**: 系统 MUST 验证输出的 JSON 结构符合 PPTist 的 TypeScript 接口定义
- **FR-019**: 系统 MUST 处理转换错误,返回包含错误位置、错误类型、建议修复方案的详细错误信息
- **FR-020**: 系统 SHOULD 提供转换元数据(幻灯片数、元素统计、处理时间、文件大小)
- **FR-021**: 系统 MUST 支持处理包含中文、日文等多语言内容的 PPTX 文件
- **FR-022**: 系统 MUST 正确处理 PPTX 中的超链接,映射为 `PPTElementLink` 结构
- **FR-023**: 系统 MUST 支持转换后的 JSON 可直接导入 PPTist 前端项目无需手动调整
- **FR-024**: 系统 MUST 使用异步任务队列架构处理 PPTX 转换任务,支持并发处理多个文件
- **FR-025**: 系统 MUST 为每个转换任务生成唯一任务 ID,并支持通过任务 ID 查询任务状态和进度
- **FR-026**: 系统 MUST 支持任务状态包括:queued(排队中)、processing(处理中)、completed(已完成)、failed(失败)
- **FR-027**: 系统 MUST 在任务完成后保留转换结果至少 24 小时,允许用户通过任务 ID 获取结果
- **FR-028**: 系统 MUST 提供批量任务状态查询接口,返回多个任务的汇总状态信息
- **FR-029**: 系统 MUST 提供无需身份认证的公开 API 访问(适用于内部工具/开发环境)
- **FR-030**: 系统 MUST 支持用户将 JSON 数据下载为独立的 .json 文件(通过单独的下载端点或在响应中提供下载链接)
- **FR-031**: 系统 API 设计应预留自动化导入 PPTist 项目的扩展接口(例如提供与 PPTist 导入 API 兼容的数据格式)
- **FR-032**: 系统 SHOULD 支持 HTTPS 加密传输(如果部署在生产环境)
- **FR-033**: 系统 MUST 将 PPTX 中的音频和视频媒体按照与图片相同的策略处理:小于 1MB 转换为 base64 嵌入,大于等于 1MB 提取为独立文件
- **FR-034**: 系统 MUST 为提取的独立媒体文件生成唯一文件名,并在 JSON 元数据中记录文件名与原始元素的映射关系
- **FR-035**: 系统 MUST 在提供 JSON 下载时,同时打包所有提取的独立媒体文件(例如提供 ZIP 压缩包下载)
- **FR-036**: 系统 MUST 输出结构化 JSON 格式日志(包含时间戳、日志级别、任务 ID、消息、上下文数据)
- **FR-037**: 系统 MUST 记录关键操作日志(任务创建、状态变更、转换开始/完成、错误信息)
- **FR-038**: 系统 MUST 支持 Prometheus 指标导出(包含任务处理时间、队列长度、错误率、API 请求量)
- **FR-039**: 系统 SHOULD 支持分布式追踪(使用 OpenTelemetry 或类似标准,记录请求链路)
- **FR-040**: 系统 MUST 在日志中不记录敏感信息(用户上传的文件内容、PPTX 具体文本内容等)
- **FR-041**: 系统 MUST 通过接口抽象层封装任务队列存储实现,支持内存队列和 Redis 队列的可插拔切换
- **FR-042**: 系统 SHOULD 默认使用内存队列实现(无需外部依赖),但架构应支持零停机切换至 Redis 队列(通过配置变更)
- **FR-043**: 系统 MUST 确保任务队列接口抽象层不依赖特定存储实现,保证未来可扩展至其他存储(如 PostgreSQL、消息队列)
- **FR-044**: 系统 MUST 支持版本化转换器,允许 API 调用指定目标 PPTist 版本(通过查询参数 `targetVersion` 或请求头 `X-PPTist-Version`)
- **FR-045**: 系统 MUST 在转换结果 JSON 中包含版本元数据(`pptistVersion` 字段),标识输出结构对应的 PPTist 版本
- **FR-046**: 系统 SHOULD 支持至少最新 2 个 PPTist 主版本(例如当前版本和上一版本),避免强制用户升级
- **FR-047**: 系统 MUST 为每个 PPTist 版本维护独立的类型定义文件和转换逻辑,确保版本间互不影响
- **FR-048**: 系统 SHOULD 在 API 文档中明确列出每个 PPTist 版本支持的特性列表和已知限制
- **FR-049**: 系统 MUST 支持通过配置文件(YAML 或 JSON 格式)定义所有可配置参数(队列类型、并发数、PPTist 版本、文件大小限制等)
- **FR-050**: 系统 MUST 支持通过环境变量覆盖配置文件中的任意参数,遵循 12-factor app 原则
- **FR-051**: 系统 MUST 在启动时验证配置的完整性和正确性,配置错误时拒绝启动并输出清晰的错误信息
- **FR-052**: 系统 SHOULD 支持多环境配置(如 config.dev.yaml、config.prod.yaml),通过环境变量 `NODE_ENV` 或 `APP_ENV` 选择加载
- **FR-053**: 系统 MUST 在日志中记录启动时使用的有效配置(脱敏敏感信息),便于问题排查
- **FR-054**: 系统 MUST 实现转换器注册表(ConverterRegistry),支持在运行时注册和查找元素类型转换器
- **FR-055**: 系统 MUST 为元素转换器定义统一接口(ElementConverter),包含 `canConvert(elementType)` 和 `convert(element, context)` 方法
- **FR-056**: 系统 MUST 在启动时自动注册核心转换器(文本、图片、形状、线条、图表、表格等)
- **FR-057**: 系统 SHOULD 支持通过配置文件或编程方式注册自定义转换器,无需修改核心代码
- **FR-058**: 系统 MUST 在遇到未注册转换器的元素类型时,记录警告并尝试降级处理(如转为图片)而非直接失败
- **FR-059**: 系统 SHOULD 在转换器注册表中维护转换器优先级,支持多个转换器处理同一元素类型时的覆盖机制
- **FR-060**: 系统 MUST 使用 URI 路径版本控制设计 API 端点(如 `/api/v1/convert`, `/api/v1/tasks/:id`),版本号作为路径的第一段
- **FR-061**: 系统 MUST 支持多个 API 版本并存,允许客户端继续使用旧版本 API,新版本发布不强制升级
- **FR-062**: 系统 SHOULD 在 API 响应头中包含当前 API 版本信息(如 `X-API-Version: v1`)
- **FR-063**: 系统 MUST 在弃用某个 API 版本时,在响应头中包含弃用警告(如 `Deprecation: true` 和 `Sunset: <date>`),至少提前 6 个月通知
- **FR-064**: 系统 SHOULD 在文档中明确说明每个 API 版本的支持状态(active/deprecated/sunset)和迁移指南

### Key Entities

- **PPTXFile**: 表示上传的 PowerPoint 文件,包含文件名、大小、二进制数据
- **ConversionTask**: 转换任务实体,包含任务 ID、状态、进度、创建时间、完成时间、目标 PPTist 版本、结果文件路径
- **ConversionResult**: 转换操作的结果,包含成功状态、JSON 数据、元数据(包含 PPTist 版本信息)、错误列表
- **ConversionMetadata**: 转换过程的元信息,包含幻灯片总数、各类型元素统计、处理时长、文件大小、目标 PPTist 版本
- **ConversionWarning**: 转换过程中的警告信息,包含警告类型、受影响的元素 ID、建议操作
- **SlideElement**: PPTX 中的元素抽象,包含类型、位置、样式、内容
- **MediaResource**: PPTX 中嵌入的媒体资源(图片、音频、视频),包含原始数据、转换后的格式
- **PPTistVersion**: 表示 PPTist 目标版本,包含版本号、类型定义路径、转换器实现类
- **ElementConverter**: 元素转换器接口,定义 `canConvert(elementType)` 和 `convert(element, context)` 方法
- **ConverterRegistry**: 转换器注册表,维护元素类型到转换器的映射关系,支持注册、查找、优先级管理

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户上传的 PPTX 文件中至少 95% 的可视化元素能成功转换为 JSON 格式
- **SC-002**: 转换后的 JSON 文件导入 PPTist 后,至少 90% 的幻灯片能正确渲染且视觉上与原 PPTX 一致
- **SC-003**: 对于典型的 10 张幻灯片、文件大小小于 5MB 的 PPTX 文件,从任务创建到完成的转换时间在 5 秒以内
- **SC-004**: 系统能处理包含最多 100 张幻灯片、文件大小 50MB 的 PPTX 文件而不崩溃
- **SC-005**: 转换后的 JSON 通过 TypeScript 类型检查,100% 符合 PPTist 的 `Slide` 接口定义
- **SC-006**: 至少 80% 的用户能够在首次使用时成功创建转换任务并获取结果(无需查看文档)
- **SC-007**: 当转换出现错误时,任务状态和错误信息能让用户理解问题的原因,并提供明确的解决建议
- **SC-008**: 系统支持转换常见的 PPTX 文件(包括 Microsoft PowerPoint 2016、2019、2021、365 创建的文件)
- **SC-009**: 系统支持至少 3 个并发转换任务同时处理而不明显降低性能(单任务处理时间增加不超过 20%)

## Assumptions

1. **PPTist 数据结构已知**: 已通过分析 `E:/ai编程实战营/PPTist/PPTist/src/types/slides.ts` 获得完整的数据结构定义,系统将支持多版本 PPTist 数据结构,默认使用当前最新版本
2. **PPTX 格式遵循 Office Open XML 标准**: 假设输入的 PPTX 文件遵循 ECMA-376 标准
3. **媒体资源处理**: 小于 1MB 的媒体文件(图片、音频、视频)转换为 base64 编码嵌入 JSON,大于等于 1MB 的文件提取为独立文件;下载时提供 ZIP 压缩包包含 JSON 和所有独立媒体文件
4. **字体处理**: 字体名称将保留为字符串,不嵌入字体文件(依赖客户端字体)
5. **动画保真度**: 元素动画将尽可能保留,但复杂动画可能降级为简单的进入/退出动画
6. **异步任务队列模型**: 系统使用任务队列架构处理转换任务,支持并发处理,任务完成后保留结果 24 小时;通过接口抽象层实现存储可插拔,默认使用内存队列,支持无缝切换至 Redis
7. **后端运行环境**: Node.js/TypeScript 环境,可使用流式处理大文件,内存队列作为默认实现(零外部依赖),Redis 队列作为可选扩展(支持横向扩展)
8. **前端集成**: 转换后的 JSON 可通过 PPTist 的导入功能直接加载(假设 PPTist 有导入 JSON 的接口)
9. **安全模型**: API 设计为内部工具使用,无需身份认证,部署在可信网络环境或通过反向代理控制访问
10. **可观测性部署**: 生产环境部署 Prometheus + Grafana 用于指标收集和可视化,日志集中存储(如 ELK 或 Loki),分布式追踪后端(如 Jaeger)可选配置
11. **版本兼容性策略**: 系统采用版本化转换器架构,初始实现支持当前 PPTist 版本,未来扩展支持多个版本,每个版本独立维护类型定义和转换逻辑
12. **配置管理策略**: 系统遵循 12-factor app 原则,使用配置文件存储默认配置,通过环境变量覆盖实现环境差异化,支持容器化部署和配置热更新
13. **转换器扩展性**: 系统采用策略模式实现元素转换器架构,核心转换器内置支持常见元素类型,自定义转换器可通过注册表动态添加,无需修改核心代码
14. **API 版本控制**: 系统采用 URI 路径版本控制策略,初始实现 v1 版本,未来发布 v2/v3 等新版本时保持旧版本可用,至少支持 2 个主版本并存

## Dependencies

1. **PPTist 前端项目**: 需要确认 PPTist 是否已支持导入 JSON 格式的幻灯片数据
2. **任务队列抽象层**: 需要设计任务队列接口抽象(TaskQueue 接口),支持内存队列(默认)和 Redis 队列(可选)的可插拔实现;可选库如 `bullmq`(支持 Redis 和内存适配器)或自建轻量级抽象
3. **XML 解析库**: 需要选择合适的 Node.js XML 解析库(如 `fast-xml-parser`、`xml2js`)
4. **ZIP 解析**: PPTX 本质上是 ZIP 压缩包,需要使用如 `jszip` 或 `adm-zip` 库
5. **类型验证**: 使用 `zod` 或类似库验证输出 JSON 结构符合 PPTist 接口
6. **临时存储**: 任务完成后需要临时存储 JSON 结果和媒体文件,可使用本地文件系统或对象存储
7. **日志库**: 需要支持结构化 JSON 日志的库(如 `winston`、`pino`)
8. **监控集成**: 需要集成 Prometheus 客户端库(如 `prom-client`)用于指标导出
9. **分布式追踪**: 需要集成 OpenTelemetry SDK 用于分布式追踪(可选但推荐)
10. **配置管理库**: 需要支持 YAML/JSON 配置文件和环境变量覆盖的库(如 `config`、`convict`、`dotenv` + 自定义加载器)
11. **转换器架构**: 需要自建轻量级转换器注册表(ElementConverter 接口 + ConverterRegistry),无需额外依赖库;使用 TypeScript 接口和类实现策略模式

## Out of Scope

以下功能明确不在本次实现范围内:

- JSON 转 PPTX(反向转换)
- 在线编辑 PPTX 文件
- 转换后的自动美化或样式优化
- 支持老版本的 PPT 格式(仅支持 .pptx)
- 实时协作处理
- 版本控制和变更历史
- 转换模板或自定义映射规则
- CDN 存储或云存储集成(媒体资源本地处理)
- WebSocket 实时推送任务进度(客户端通过轮询查询状态)
- 用户账户系统和权限管理(公开 API,无需认证)
- 任务调度或定时转换功能
