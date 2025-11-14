window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const img1Input = document.getElementById("img1");
  const img2Input = document.getElementById("img2");
  const morphBtn = document.getElementById("morphBtn");

  // clear file inputs on load so filenames don't persist after refresh
  img1Input.value = "";
  img2Input.value = "";

  let pixelsA = null;
  let pixelsB = null;
  let sourcePixels = []; // {x, y, origX, origY, color} for animation
  let targetPositions = []; // {x, y, color} destination coordinates
  let animating = false;

  // make loadImage return a Promise so startMorph can await missing files
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const temp = document.createElement("canvas");
          temp.width = W;
          temp.height = H;
          const tctx = temp.getContext("2d");
          tctx.drawImage(img, 0, 0, W, H);
          const data = tctx.getImageData(0, 0, W, H).data;
          resolve(data);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  // compute hue, saturation, lightness for sorting
  function colorKey(color) {
    const r = color[0] / 255;
    const g = color[1] / 255;
    const b = color[2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = d / (1 - Math.abs(2 * l - 1));
    }
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = h * 60;
      if (h < 0) h += 360;
    }
    return { h, s, l };
  }

  function compareByColor(a, b) {
    const ka = a._ck || (a._ck = colorKey(a.color));
    const kb = b._ck || (b._ck = colorKey(b.color));
    if (ka.h !== kb.h) return ka.h - kb.h;
    if (ka.s !== kb.s) return ka.s - kb.s;
    return ka.l - kb.l;
  }

  function createPixelsArray(imgData, storeOrig = false) {
    const arr = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3];
        // keep only visible pixels
        if (a > 0) {
          const p = { x, y, color: [r, g, b, a] };
          if (storeOrig) {
            p.origX = x;
            p.origY = y;
          }
          arr.push(p);
        }
      }
    }
    return arr;
  }

  img1Input.addEventListener("change", async e => {
    const data = await loadImage(e.target.files[0]);
    pixelsA = data;
    sourcePixels = createPixelsArray(pixelsA, true);
  });

  img2Input.addEventListener("change", async e => {
    const data = await loadImage(e.target.files[0]);
    pixelsB = data;
    targetPositions = createPixelsArray(pixelsB, false);
  });

  // startMorph now checks for input files even if filenames are visible but data not loaded
  async function startMorph() {
    // if file inputs contain files but arrays are missing, load them
    const promises = [];
    if (img1Input.files.length && !sourcePixels.length) {
      promises.push(loadImage(img1Input.files[0]).then(data => {
        pixelsA = data;
        sourcePixels = createPixelsArray(pixelsA, true);
      }));
    }
    if (img2Input.files.length && !targetPositions.length) {
      promises.push(loadImage(img2Input.files[0]).then(data => {
        pixelsB = data;
        targetPositions = createPixelsArray(pixelsB, false);
      }));
    }
    if (promises.length) await Promise.all(promises);

    if (!sourcePixels.length || !targetPositions.length) {
      alert("Please select both images (re-upload if the filename is shown but the image isn't loaded).");
      return;
    }

    ctx.clearRect(0, 0, W, H); // Clears the canvas

    // Reset source pixels to their original positions
    for (const p of sourcePixels) {
      if (p.origX !== undefined) p.x = p.origX;
      if (p.origY !== undefined) p.y = p.origY;
      p.tx = undefined;
      p.ty = undefined;
      // clear cached colorKey
      delete p._ck;
    }
    for (const t of targetPositions) delete t._ck;

    // Sort source and target by color (hue, saturation, lightness)
    sourcePixels.sort(compareByColor);
    targetPositions.sort(compareByColor);

    // Match by index
    const N = Math.min(sourcePixels.length, targetPositions.length);
    for (let i = 0; i < N; i++) {
      sourcePixels[i].tx = targetPositions[i].x;
      sourcePixels[i].ty = targetPositions[i].y;
    }

    animating = true;
    animateMorph();
  }

  function animateMorph() {
    if (!animating) return;

    ctx.clearRect(0, 0, W, H);
    let done = true;

    for (const p of sourcePixels) {
      if (p.tx === undefined) {
        // draw remaining pixels at their original spots
        const [r, g, b, a] = p.color;
        ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        continue;
      }

      // Move pixel toward target
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const step = 0.15; // speed of motion
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) done = false;

      p.x += dx * step;
      p.y += dy * step;

      const [r, g, b, a] = p.color;
      ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }

    if (!done) requestAnimationFrame(animateMorph);
    else animating = false;
  }

  morphBtn.addEventListener("click", () => {
    startMorph().catch(err => {
      console.error(err);
      alert("Error loading images. Try re-uploading them.");
    });
  });
});
