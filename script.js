window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const img1Input = document.getElementById("img1");
  const img2Input = document.getElementById("img2");
  const dropZone1 = document.getElementById("dropZone1");
  const dropZone2 = document.getElementById("dropZone2");
  const preview1 = document.getElementById("preview1");
  const preview2 = document.getElementById("preview2");
  const prompt1 = document.getElementById("prompt1");
  const prompt2 = document.getElementById("prompt2");

  const speedSlider = document.getElementById("speedSlider");
  const speedVal = document.getElementById("speedVal");
  const morphBtn = document.getElementById("morphBtn");

  const explorerModal = document.getElementById("explorerModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const explorerList = document.getElementById("explorerList");
  const fileCountText = document.getElementById("fileCountText");
  const importPresetBtn = document.getElementById("importPresetBtn");
  const presetImportInput = document.getElementById("presetImportInput");

  let activeSlot = null;
  const presetItems = Array.isArray(window.PRESET_FILES) ? [...window.PRESET_FILES] : [];

  img1Input.value = "";
  img2Input.value = "";

  let speedMultiplier = 1.0;
  speedSlider.addEventListener("input", e => {
    speedMultiplier = parseFloat(e.target.value);
    speedVal.textContent = speedMultiplier.toFixed(1) + "x";
  });

  let pixelsA = null;
  let pixelsB = null;
  let sourcePixels = [];
  let targetPositions = [];
  let animating = false;

  const frameBuffer = ctx.createImageData(W, H);
  const bufferData = frameBuffer.data;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const temp = document.createElement("canvas");
          temp.width = W;
          temp.height = H;
          const tctx = temp.getContext("2d");
          tctx.drawImage(img, 0, 0, W, H);
          const data = tctx.getImageData(0, 0, W, H).data;
          const dataUrl = temp.toDataURL();
          resolve({ data, dataUrl });
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromSrc(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const temp = document.createElement("canvas");
        temp.width = W;
        temp.height = H;
        const tctx = temp.getContext("2d");
        tctx.drawImage(img, 0, 0, W, H);
        const data = tctx.getImageData(0, 0, W, H).data;
        const dataUrl = temp.toDataURL();
        resolve({ data, dataUrl });
      };
      img.onerror = () => reject(new Error("Failed to load preset image"));
      img.src = src;
    });
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

        if (a > 0) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const p = { x, y, color: [r, g, b, a], lum };
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

  function setupDropZone(dropZone, fileInput, previewImg, promptText, onFileReady) {
    ["dragenter", "dragover"].forEach(name => {
      dropZone.addEventListener(name, e => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(name => {
      dropZone.addEventListener(name, e => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
      });
    });

    dropZone.addEventListener("drop", async e => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        fileInput.files = e.dataTransfer.files;
        await processFile(file);
      }
    });

    fileInput.addEventListener("click", () => {
      fileInput.value = "";
    });

    fileInput.addEventListener("change", async e => {
      if (e.target.files && e.target.files.length) {
        await processFile(e.target.files[0]);
      }
    });

    async function processFile(file) {
      const res = await loadImage(file);
      if (!res) return;
      previewImg.src = res.dataUrl;
      previewImg.classList.add("active");
      promptText.style.display = "none";
      await onFileReady(res.data);
    }
  }

  setupDropZone(dropZone1, img1Input, preview1, prompt1, async data => {
    pixelsA = data;
    sourcePixels = createPixelsArray(pixelsA, true);
  });

  setupDropZone(dropZone2, img2Input, preview2, prompt2, async data => {
    pixelsB = data;
    targetPositions = createPixelsArray(pixelsB, false);
  });

  function populateExplorer() {
    explorerList.innerHTML = "";
    fileCountText.textContent = `${presetItems.length} items`;

    presetItems.forEach(file => {
      const item = document.createElement("div");
      item.className = "explorer-item";

      const thumb = document.createElement("img");
      thumb.className = "explorer-thumb";
      thumb.src = file.dataUrl || file.path;
      thumb.alt = file.name;

      const label = document.createElement("span");
      label.className = "explorer-name";
      label.textContent = file.name;

      item.appendChild(thumb);
      item.appendChild(label);

      item.addEventListener("click", async () => {
        try {
          const res = await loadImageFromSrc(file.dataUrl || file.path);
          if (activeSlot === "1") {
            pixelsA = res.data;
            preview1.src = res.dataUrl;
            preview1.classList.add("active");
            prompt1.style.display = "none";
            sourcePixels = createPixelsArray(pixelsA, true);
          } else if (activeSlot === "2") {
            pixelsB = res.data;
            preview2.src = res.dataUrl;
            preview2.classList.add("active");
            prompt2.style.display = "none";
            targetPositions = createPixelsArray(pixelsB, false);
          }
          closeModal();
        } catch (err) {
          console.error(err);
        }
      });

      explorerList.appendChild(item);
    });
  }

  populateExplorer();

  document.querySelectorAll(".preset-trigger-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeSlot = btn.getAttribute("data-slot");
      explorerModal.classList.remove("hidden");
    });
  });

  function closeModal() {
    explorerModal.classList.add("hidden");
    activeSlot = null;
  }

  modalCloseBtn.addEventListener("click", closeModal);

  explorerModal.addEventListener("click", e => {
    if (e.target === explorerModal) closeModal();
  });

  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && !explorerModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  importPresetBtn.addEventListener("click", () => {
    presetImportInput.click();
  });

  presetImportInput.addEventListener("change", e => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        presetItems.push({
          name: file.name,
          dataUrl: ev.target.result,
        });
        populateExplorer();
      };
      reader.readAsDataURL(file);
    });
  });

  async function startMorph() {
    const promises = [];
    if (img1Input.files.length && !sourcePixels.length) {
      promises.push(loadImage(img1Input.files[0]).then(res => {
        pixelsA = res.data;
        preview1.src = res.dataUrl;
        preview1.classList.add("active");
        prompt1.style.display = "none";
        sourcePixels = createPixelsArray(pixelsA, true);
      }));
    }
    if (img2Input.files.length && !targetPositions.length) {
      promises.push(loadImage(img2Input.files[0]).then(res => {
        pixelsB = res.data;
        preview2.src = res.dataUrl;
        preview2.classList.add("active");
        prompt2.style.display = "none";
        targetPositions = createPixelsArray(pixelsB, false);
      }));
    }
    if (promises.length) await Promise.all(promises);

    if (!sourcePixels.length || !targetPositions.length) {
      alert("Please select both images or choose a preset.");
      return;
    }

    bufferData.fill(0);
    for (let i = 0; i < sourcePixels.length; i++) {
      const p = sourcePixels[i];
      if (p.origX !== undefined) p.x = p.origX;
      if (p.origY !== undefined) p.y = p.origY;
      const px = (p.x + 0.5) | 0;
      const py = (p.y + 0.5) | 0;
      if (px >= 0 && px < W && py >= 0 && py < H) {
        const idx = (py * W + px) * 4;
        const color = p.color;
        bufferData[idx] = color[0];
        bufferData[idx + 1] = color[1];
        bufferData[idx + 2] = color[2];
        bufferData[idx + 3] = color[3];
      }
    }
    ctx.putImageData(frameBuffer, 0, 0);

    sourcePixels.sort((a, b) => a.lum - b.lum);
    targetPositions.sort((a, b) => a.lum - b.lum);

    const numTargets = targetPositions.length;
    for (let i = 0; i < sourcePixels.length; i++) {
      const p = sourcePixels[i];
      const targetIdx = Math.min(numTargets - 1, Math.floor((i / sourcePixels.length) * numTargets));

      p.tx = targetPositions[targetIdx].x;
      p.ty = targetPositions[targetIdx].y;
      p.startX = p.x;
      p.startY = p.y;
      p.progress = 0;
      p.speed = (0.008 + Math.random() * 0.006) * speedMultiplier;
      p.curve = (Math.random() - 0.5) * 35;
    }

    morphBtn.disabled = true;
    morphBtn.textContent = "Starting...";

    setTimeout(() => {
      animating = true;
      morphBtn.textContent = "Start Morph";
      morphBtn.disabled = false;
      animateMorph();
    }, 1000);
  }

  function animateMorph() {
    if (!animating) return;

    bufferData.fill(0);
    let done = true;

    for (let i = 0; i < sourcePixels.length; i++) {
      const p = sourcePixels[i];

      if (p.progress < 1) {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 1;
        done = false;

        const t = p.progress;
        const ease = t * t * (3 - 2 * t);

        const dirX = p.tx - p.startX;
        const dirY = p.ty - p.startY;
        const dist = Math.hypot(dirX, dirY) || 1;
        const arc = Math.sin(t * Math.PI) * p.curve;

        p.x = p.startX + dirX * ease + (-dirY / dist) * arc;
        p.y = p.startY + dirY * ease + (dirX / dist) * arc;
      } else {
        p.x = p.tx;
        p.y = p.ty;
      }

      const px = (p.x + 0.5) | 0;
      const py = (p.y + 0.5) | 0;

      if (px >= 0 && px < W && py >= 0 && py < H) {
        const idx = (py * W + px) * 4;
        const color = p.color;
        bufferData[idx] = color[0];
        bufferData[idx + 1] = color[1];
        bufferData[idx + 2] = color[2];
        bufferData[idx + 3] = color[3];
      }
    }

    ctx.putImageData(frameBuffer, 0, 0);

    if (!done) {
      requestAnimationFrame(animateMorph);
    } else {
      animating = false;
    }
  }

  morphBtn.addEventListener("click", () => {
    startMorph().catch(err => {
      console.error(err);
      alert("Error loading images. Try re-uploading them.");
    });
  });
});
