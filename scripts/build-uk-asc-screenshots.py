"""Build 1284x2778 UK Track Details shots from the GPS line previews. Does not upload."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "_workspace" / "uk-line-previews"
OUT = ROOT / "docs" / "ios" / "screenshots" / "uk-iphone-6.5"
W, H = 1284, 2778
BG = (15, 23, 42)
SHOTS = [
    ("brands-hatch.png", "Brands Hatch"),
    ("donington.png", "Donington Park"),
    ("cadwell-park.png", "Cadwell Park"),
]

def font(size):
    for name in ("segoeui.ttf", "arial.ttf"):
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    title_font = font(64)
    name_font = font(84)
    for index, (file_name, circuit) in enumerate(SHOTS, start=1):
        src = Image.open(SRC / file_name).convert("RGBA")
        canvas = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(canvas)
        draw.text((80, 160), "Track Details", font=title_font, fill=(148, 163, 184))
        draw.text((80, 250), circuit, font=name_font, fill=(248, 250, 252))
        max_side = 980
        scale = min(max_side / src.width, max_side / src.height)
        resized = src.resize((int(src.width * scale), int(src.height * scale)), Image.Resampling.LANCZOS)
        x = (W - resized.width) // 2
        y = 480 + (1600 - resized.height) // 2
        canvas.paste(resized, (x, y), resized)
        dest = OUT / f"uk-iphone65-0{index}-{file_name}"
        canvas.save(dest, "PNG")
        print(f"{dest.name} {canvas.size[0]}x{canvas.size[1]}")

if __name__ == "__main__":
    main()
