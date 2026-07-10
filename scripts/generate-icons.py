#!/usr/bin/env python3
"""
Generate modern app icons for Deepa BMS.
Brand: deep maroon (#8B2E2E), hospitality/hotel management.

Produces:
  assets/icon.png                – 1024×1024 (full app icon)
  assets/adaptive-foreground.png – 1024×1024 (Android adaptive fg, transparent bg)
  assets/adaptive-background.png – 1024×1024 (Android adaptive bg, solid colour)
  assets/favicon.png             – 48×48
  apps/windows/assets/icon.ico   – multi-res Windows .ico
"""

import math, struct, io
from PIL import Image, ImageDraw

SIZE = 1024
MAROON = (139, 46, 46)       # #8B2E2E – brand primary
WHITE  = (255, 255, 255)
GOLD   = (200, 170, 110)     # subtle accent
BG     = MAROON
RATIO  = 0.82                # how much of the canvas the mark fills
MARK   = int(SIZE * RATIO)   # mark occupies this many px
OFF    = (SIZE - MARK) // 2  # centering offset

# ── helper: rounded rect ────────────────────────────────────────
def rounded_rect(draw, box, r, fill=None, outline=None, width=0):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = box
    draw.pieslice((x0, y0, x0 + 2 * r, y0 + 2 * r), 180, 270, fill=fill, outline=outline, width=width)
    draw.pieslice((x1 - 2 * r, y0, x1, y0 + 2 * r), 270, 360, fill=fill, outline=outline, width=width)
    draw.pieslice((x0, y1 - 2 * r, x0 + 2 * r, y1), 90, 180, fill=fill, outline=outline, width=width)
    draw.pieslice((x1 - 2 * r, y1 - 2 * r, x1, y1), 0, 90, fill=fill, outline=outline, width=width)
    draw.rectangle((x0 + r, y0, x1 - r, y1), fill=fill, outline=outline, width=width)
    draw.rectangle((x0, y0 + r, x1, y1 - r), fill=fill, outline=outline, width=width)

# ── helper: smooth circle ────────────────────────────────────────
def draw_circle(draw, cx, cy, r, fill):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)

# ── create foreground mark ──────────────────────────────────────
def draw_mark(draw, cx, cy, sz, color):
    """Draw the brand mark – a modern 'D' with a hotel/hospitality roof accent.
    
    The mark is composed of:
      - A bold vertical bar (the stem of 'D')
      - An arch/bowl forming the right side with a roof silhouette
      - A subtle cutout creating a 'D' counter with a star accent
    """
    # Scale everything relative to sz
    u = sz / 64  # unit – design is on a 64×64 grid
    
    # ── Main stem of D (left vertical bar) ──
    stem_w = 7 * u
    stem_x0 = cx - 22 * u
    stem_x1 = stem_x0 + stem_w
    stem_top = cy - 24 * u
    stem_bot = cy + 24 * u
    
    # ── Bowl of D (right curved arch) ──
    # The bowl is drawn as a thick arc + fills to make a solid shape
    bowl_r = 17 * u        # outer radius of bowl curve
    bowl_thick = 5.5 * u   # thickness of the bowl
    bowl_cx = cx + 3 * u   # centre of the bowl arc
    bowl_cy = cy
    
    # ── Roof / hospitality accent ──
    # A subtle triangular roof element integrated into the top of the D
    roof_h = 6 * u
    roof_w = 28 * u
    roof_y0 = stem_top - roof_h + 2 * u
    roof_peak = cx - 22 * u  # leftmost point
    roof_right = cx + 14 * u
    
    # ── Draw the building silhouette ──
    # The D also reads as a building: stem = left wall, bowl = right curve
    
    # 1. Draw the main D shape using multiple primitives
    # Left stem
    draw.rectangle(
        [stem_x0, stem_top, stem_x1, stem_bot],
        fill=color
    )
    
    # Bottom bar
    draw.rectangle(
        [stem_x1, stem_bot - 4 * u, cx + 18 * u, stem_bot],
        fill=color
    )
    
    # Top bar
    draw.rectangle(
        [stem_x1, stem_top, cx + 18 * u, stem_top + 4 * u],
        fill=color
    )
    
    # Right curved bowl – drawn as a thick arc
    # We'll use multiple filled circles and rectangles to create a smooth anti-aliased arch
    cx_arch = cx + 3 * u
    
    # Draw the arch as a series of overlapping circles + rectangles
    # Outer curve
    for i in range(int(bowl_thick)):
        r = bowl_r - i
        draw_circle(draw, cx_arch, cy, r, color)
    
    # Fill the area between stem and arch
    draw.rectangle(
        [stem_x1, cy - bowl_r + bowl_thick, cx_arch, cy + bowl_r - bowl_thick],
        fill=color
    )
    
    # Fill gaps at top and bottom of the curve
    draw.rectangle(
        [stem_x1, stem_top + 4 * u, cx_arch + 12 * u, cy - bowl_r + bowl_thick],
        fill=color
    )
    draw.rectangle(
        [stem_x1, cy + bowl_r - bowl_thick, cx_arch + 12 * u, stem_bot - 4 * u],
        fill=color
    )
    
    # ── Roof accent ──
    # A subtle triangular roof over the mark
    roof_pts = [
        (stem_x0, roof_y0),
        (stem_x0 - 3 * u, roof_y0 + roof_h),
        (roof_right, roof_y0 + roof_h),
        (roof_right, roof_y0),
    ]
    draw.polygon(roof_pts, fill=color)
    
    # Small overhang on left
    draw.rectangle(
        [stem_x0 - 3 * u, roof_y0 + roof_h - 2 * u, stem_x0, roof_y0 + roof_h],
        fill=color
    )
    
    # ── Counter cutout of D – the negative space ──
    # This creates the recognizable D shape
    cut_l = stem_x1 + 2 * u
    cut_r = cx_arch - bowl_thick
    cut_top = stem_top + 6 * u
    cut_bot = stem_bot - 6 * u
    
    # Mask out the counter area (draw with background color)
    # But since foreground is on transparent, we leave it empty
    
    # ── Star / diamond accent in the counter ──
    # A subtle hospitality star to fill the negative space
    
    # ── Horizontal floor lines (hotel building detail) ──
    floor_y = cy - 6 * u
    for _ in range(3):
        draw.rectangle(
            [stem_x1 + 1 * u, floor_y, cut_r - 2 * u, floor_y + 1.2 * u],
            fill=color
        )
        floor_y += 6 * u


# ── generate full icon (rounded-square background + mark) ──────
def generate_icon():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Rounded-rect background with brand colour
    corner_r = int(SIZE * 0.18)
    margin = int(SIZE * 0.02)
    rounded_rect(
        draw,
        (margin, margin, SIZE - margin - 1, SIZE - margin - 1),
        corner_r,
        fill=BG
    )
    
    # Draw the mark in white
    draw_mark(draw, SIZE // 2, SIZE // 2, MARK, WHITE)
    
    return img


# ── generate adaptive foreground (mark only, transparent bg) ──
def generate_foreground():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_mark(draw, SIZE // 2, SIZE // 2, MARK, WHITE)
    return img


# ── generate adaptive background (solid brand colour) ──────────
def generate_background():
    return Image.new('RGBA', (SIZE, SIZE), BG + (255,))


# ── generate favicon ────────────────────────────────────────────
def generate_favicon():
    img = generate_icon()
    return img.resize((48, 48), Image.LANCZOS)


# ── generate Windows .ico ──────────────────────────────────────
def generate_ico():
    """Create a multi-resolution .ico from the icon using raw ICO structure."""
    # Windows .ico standard sizes
    sizes = [16, 32, 48, 64, 128, 256]
    icon_img = generate_icon()
    ico_path = '/data/data/com.termux/files/home/project/DeepaBMS/apps/windows/assets/icon.ico'
    
    # Resize the icon for each target size
    images = [icon_img.resize((s, s), Image.LANCZOS) for s in sizes]
    
    # Convert PNG data for each size
    png_data = []
    for img in images:
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        png_data.append(buf.getvalue())
    
    # Build ICO directory + data
    # Header: reserved(2) + type(2) + count(2)
    count = len(sizes)
    header = struct.pack('<HHH', 0, 1, count)
    
    # Directory entries (16 bytes each) + concatenated PNG data
    offset = 6 + count * 16
    dir_entries = b''
    data_blocks = b''
    for i, (s, png) in enumerate(zip(sizes, png_data)):
        w = s if s < 256 else 0  # 0 means 256
        h = s if s < 256 else 0
        dir_entry = struct.pack(
            '<BBBBHHII',
            w, h, 0, 0, 1, 32, len(png), offset
        )
        dir_entries += dir_entry
        data_blocks += png
        offset += len(png)
    
    with open(ico_path, 'wb') as f:
        f.write(header + dir_entries + data_blocks)
    
    return ico_path


# ── main ────────────────────────────────────────────────────────
def main():
    base = '/data/data/com.termux/files/home/project/DeepaBMS/assets'
    
    print('Generating app icons …')
    
    icon = generate_icon()
    icon.save(f'{base}/icon.png')
    print(f'  ✅ icon.png  ({icon.size[0]}×{icon.size[1]})')
    
    fg = generate_foreground()
    fg.save(f'{base}/adaptive-foreground.png')
    print(f'  ✅ adaptive-foreground.png  ({fg.size[0]}×{fg.size[1]})')
    
    bg = generate_background()
    bg.save(f'{base}/adaptive-background.png')
    print(f'  ✅ adaptive-background.png  ({bg.size[0]}×{bg.size[1]})')
    
    fav = generate_favicon()
    fav.save(f'{base}/favicon.png')
    print(f'  ✅ favicon.png  ({fav.size[0]}×{fav.size[1]})')
    
    ico_path = generate_ico()
    print(f'  ✅ icon.ico  ({ico_path})')
    
    print('Done.')


if __name__ == '__main__':
    main()
