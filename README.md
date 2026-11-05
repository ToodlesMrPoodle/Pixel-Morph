# Pixel Morph

Inspired by [obamify.com](https://obamify.com/)

A browser-based JavaScript application that rearranges source pixels to reconstruct a target image using the original source color palette.

## Live Demo

[Try the Live Demo](https://toodlesmrpoodle.github.io/Pixel-Morph/)

---

## How It Works

### 1. Perceived Luminance Matching
Rather than sorting by hue, the algorithm calculates perceived brightness for every pixel:

$$\text{Luminance} = 0.299R + 0.587G + 0.114B$$

Sorting both source and target pixel arrays by luminance matches dark source pixels to dark target areas and bright source pixels to bright target areas. The source palette remains completely intact while forming the silhouette and shading of the target image.

### 2. Motion Physics and Curves
Particles follow cubic ease-in-out trajectories combined with randomized perpendicular arc deflections:
- Smooth acceleration and deceleration.
- Gentle particle swirl during flight.
- Exact landing on target coordinates without jitter.

### 3. High-Performance Buffer Rendering
The animation loop writes raw pixel bytes directly into an `ImageData` buffer:
- Eliminates over 60,000 canvas `fillRect` draw calls per frame.
- Renders at a smooth 60 FPS with minimal memory overhead.

### 4. Windows File Explorer Preset Picker
- Click the **Presets** button above either image slot to open a built-in File Explorer dialog.
- Pick from preset photos or import new pictures directly into the picker.
- Square pixelated preview thumbnails reflect the exact 256x256 grid processed by the algorithm.

---

## Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ToodlesMrPoodle/Pixel-Morph.git
   cd Pixel-Morph
   ```

2. Open `index.html` in your web browser.

### Adding New Presets

1. Place your image files (`.jpg`, `.png`, `.webp`) in the `presets/` folder.
2. Run the sync script to update the manifest:
   ```bash
   python update_presets.py
   ```
3. Refresh `index.html` in your browser.

---

## License

MIT License.
