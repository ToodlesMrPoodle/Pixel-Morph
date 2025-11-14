# **Pixel Morph**
Inspired by [obamify.com](https://obamify.com/)

Pixel Morph is a browser-based JavaScript program that animates a smooth transition from one image to another by matching pixels based on color. The program works directly in an HTML canvas and allows users to upload two images to watch them morph in real-time.
## **Live Demo**
[github.io page](https://toodlesmrpoodle.github.io/Pixel-Morph/)

### **Installation**
1. Clone or download the repository:
```bash
git clone https://github.com/ToodlesMrPoodle/Pixel-Morph.git
cd Pixel-Morph
```
2. Open the `index.html` file in your browser.

### **How It Works**
The program uses:
* **Pixel Matching:** Creates arrays of visible pixels from both images and sorts them by color (hue -> saturation -> lightness).
* **Color Handling:** Only visible pixels (`alpha > 0`) are included in the morphing process.

## **Contributing**
If you find any issues or have suggestions for improvements, feel free to open an issue or submit a pull request.
