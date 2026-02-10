# 创建测试用 PPTX 文件

## 方法 1: 手动创建（最简单）

### 步骤：
1. 打开 Microsoft PowerPoint 或 WPS Presentation
2. 创建新演示文稿
3. 添加 1-2 张幻灯片，包含：
   - **第1张**: 标题 + 一个文本框
   - **第2张**（可选）: 一个矩形形状
4. 保存为 `simple.pptx`
5. 复制到 `tests/fixtures/simple.pptx`

### 内容建议：
```
第1张幻灯片：
- 标题：Test Presentation
- 副标题：E2E Test
- 一个文本框：Hello World

第2张幻灯片（可选）：
- 标题：Elements Test
- 一个蓝色矩形
```

---

## 方法 2: 使用 Python 脚本创建

如果你的环境有 Python，可以使用 `python-pptx` 库：

```bash
pip install python-pptx
```

然后运行：

```python
from pptx import Presentation

# 创建演示文稿
prs = Presentation()

# 第1张幻灯片 - 标题页
title_slide = prs.slides.add_slide(prs.slide_layouts[0])
title = title_slide.shapes.title
subtitle = title_slide.placeholders[1]

title.text = "Test Presentation"
subtitle.text = "E2E Test"

# 第2张幻灯片 - 内容页
blank_slide = prs.slides.add_slide(prs.slide_layouts[5])
left = top = width = height = prs.inches(1)
textbox = blank_slide.shapes.add_textbox(left, top, width, height)
text_frame = textbox.text_frame
text_frame.text = "Hello, World!"

# 添加矩形
left = top = prs.inches(2)
rect = blank_slide.shapes.add_shape(1, left, top, prs.inches(2), prs.inches(1))
rect.fill.solid()
rect.fill.fore_color.rgb = (0x70, 0xC0, 0x00)  # 蓝色

# 保存
prs.save('tests/fixtures/simple.pptx')
print("✅ PPTX 文件已创建: tests/fixtures/simple.pptx")
```

---

## 方法 3: 下载示例文件

从以下位置下载简单的 PPTX 文件：
- GitHub 上的 Office 示例
- Microsoft 官方示例

---

## 文件要求

测试文件应满足：
- ✅ 有效的 PPTX 文件（.pptx 扩展名）
- ✅ 至少 1 张幻灯片
- ✅ 包含文本内容
- ✅ 文件大小 < 100KB
- ⭕ 不包含密码保护
- ⭕ 不包含宏
- ⭕ 不包含外部媒体链接

---

## 验证文件

创建文件后，运行：

```bash
# 检查文件是否存在
ls -lh tests/fixtures/simple.pptx

# 检查文件类型（应该是 ZIP）
file tests/fixtures/simple.pptx
```

---

准备好后，告诉我文件已创建，我将更新测试代码！
