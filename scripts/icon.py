"""Draws media/icon.png: a cream page with one paragraph in focus (blue bar,
highlighted key word) and the lines around it faded, on a calm blue tile.
Drawn at 4x and scaled down for smooth edges. Run: python3 scripts/icon.py"""
from pathlib import Path

from PIL import Image, ImageDraw

S = 1024
OUT = Path(__file__).resolve().parent.parent / "media" / "icon.png"

TILE = "#3d5a80"
PAGE = "#fbf7ec"
INK = "#2b2b2b"
FADED = "#d8d2c2"
ACCENT = "#0969da"
MARK = "#fff1a8"

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((0, 0, S - 1, S - 1), radius=210, fill=TILE)
d.rounded_rectangle((150, 130, 874, 894), radius=70, fill=PAGE)

def line(y, x0, x1, color):
    d.rounded_rectangle((x0, y, x1, y + 52), radius=26, fill=color)

left, right = 270, 770
line(225, left, right, FADED)
line(320, left, right - 90, FADED)

# The paragraph in focus.
d.rounded_rectangle((196, 430, 238, 674), radius=21, fill=ACCENT)
line(440, left, right, INK)
d.rounded_rectangle((left - 26, 508, 574, 616), radius=28, fill=MARK)
line(536, left + 6, 540, INK)
line(536, 604, right, INK)
line(632 - 10, left, right - 140, INK)

line(730, left, right, FADED)
line(820 - 5, left, right - 200, FADED)

img.resize((256, 256), Image.LANCZOS).save(OUT, optimize=True)
print(OUT)
