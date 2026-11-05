"""
Scans the presets folder and updates presets.js.
Run: python update_presets.py
"""

from pathlib import Path
import base64
import json

base_dir = Path(__file__).resolve().parent
presets_dir = base_dir / "presets"
presets_js = base_dir / "presets.js"

items = []
valid_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}

for file_path in sorted(presets_dir.iterdir()):
    if file_path.is_file() and file_path.suffix.lower() in valid_extensions:
        mime = "image/jpeg" if file_path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
        raw_bytes = file_path.read_bytes()
        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        items.append({
            "name": file_path.name,
            "dataUrl": f"data:{mime};base64,{b64}"
        })

content = "// Auto-generated preset list\nwindow.PRESET_FILES = " + json.dumps(items, indent=2) + ";\n"
presets_js.write_text(content, encoding="utf-8")
print(f"Updated presets.js with {len(items)} images.")
