# Test Fixtures

This directory contains test fixture files for the conversion service.

## simple.pptx

A minimal PPTX file with 3 slides for testing basic conversion:

- **Slide 1**: Text element (title)
- **Slide 2**: Image element
- **Slide 3**: Shape element (rectangle)

### Creating simple.pptx

1. Open PowerPoint or Google Slides
2. Create 3 slides:
   - Slide 1: Add a title "Test Presentation"
   - Slide 2: Insert any small image
   - Slide 3: Add a rectangle shape
3. Save as `simple.pptx`

### Alternative: Use Python to create

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Slide 1: Text
slide_layout = prs.slide_layouts[6]  # Blank
slide = prs.slides.add_slide(slide_layout)
txBox = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(10), Inches(1))
tf = txBox.text_frame
tf.text = "Test Presentation"

# Slide 2: Shape
slide = prs.slides.add_slide(slide_layout)
slide.shapes.add_shape(1, Inches(2), Inches(2), Inches(2), Inches(2))  # Rectangle

# Slide 3: Another shape
slide = prs.slides.add_slide(slide_layout)
slide.shapes.add_shape(9, Inches(3), Inches(3), Inches(3), Inches(2))  # Arrow

prs.save('simple.pptx')
```

## corrupted.pptx

A deliberately corrupted PPTX file for testing error handling.

### Creating corrupted.pptx

```bash
# Create a random file with .pptx extension
dd if=/dev/urandom of=corrupted.pptx bs=1024 count=10
```

## invalid.txt

A plain text file for testing format validation.

```text
This is not a PPTX file.
```
