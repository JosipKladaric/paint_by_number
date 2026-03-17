/**
 * ChromaCraft Pro - Advanced Artist Workspace
 * Logic for 3-way split, Zoom, Color Dropping, and Local Refinement.
 */

class ChromaCraftPro {
    constructor() {
        this.initElements();
        this.initConstants();
        this.initState();
        this.initEventListeners();
        this.renderAvailableColors();
    }

    initElements() {
        this.imageUpload = document.getElementById('image-upload');
        this.originalCanvas = document.getElementById('original-canvas');
        this.colorCanvas = document.getElementById('color-canvas');
        this.outlineCanvas = document.getElementById('outline-canvas');
        this.recipeList = document.getElementById('recipe-list');
        this.availableColorsEl = document.getElementById('available-colors');
        this.splitView = document.getElementById('split-view');
        this.welcomeMessage = document.getElementById('welcome-message');
        this.loader = document.getElementById('loader');
        this.loaderText = document.getElementById('loader-text');
        this.downloadBtn = document.getElementById('download-btn');
        this.printBtn = document.getElementById('print-btn');
        this.postProcessActions = document.getElementById('post-process-actions');
        this.recipeCountBadge = document.getElementById('recipe-count');
        
        // Panels & Wrappers
        this.clothContainers = document.querySelectorAll('.cloth-container');
        this.wrappers = document.querySelectorAll('.canvas-wrapper');
        
        // Settings
        this.printWidthInput = document.getElementById('print-width');
        this.brushSizeInput = document.getElementById('brush-size');
        this.minAreaEl = document.getElementById('min-area-px');

        // Zoom Controls
        this.zoomInBtn = document.getElementById('zoom-in');
        this.zoomOutBtn = document.getElementById('zoom-out');
        this.zoomLevelEl = document.getElementById('zoom-level');
        this.wrappers = document.querySelectorAll('.canvas-wrapper');

        // Color Picker HUD
        this.pickerHud = document.getElementById('picker-hud');
        this.hudSwatch = document.getElementById('hud-swatch');
        this.hudName = document.getElementById('hud-name');
        this.hudRecipe = document.getElementById('hud-recipe');

        // Highlight Overlays
        this.originalHighlight = document.getElementById('original-highlight');
        this.colorHighlight = document.getElementById('color-highlight');

        // Toolbar Buttons
        this.undoBtn = document.getElementById('undo-btn');
        this.redoBtn = document.getElementById('redo-btn');
        this.exportSvgBtn = document.getElementById('export-svg-btn');
    }

    initConstants() {
        this.standardAcrylics = [
            { name: "Titanium White", hex: "#FFFFFF", rgb: [255, 255, 255] },
            { name: "Carbon Black", hex: "#1A1A1A", rgb: [26, 26, 26] },
            { name: "Cadmium Red", hex: "#D90429", rgb: [217, 4, 41] },
            { name: "Ultramarine", hex: "#023E8A", rgb: [2, 62, 138] },
            { name: "Cadmium Yellow", hex: "#FFB703", rgb: [255, 183, 3] },
            { name: "Viridian Green", hex: "#007F5F", rgb: [0, 127, 95] },
            { name: "Burnt Sienna", hex: "#7E3A20", rgb: [126, 58, 32] },
            { name: "Cadmium Orange", hex: "#FB8500", rgb: [251, 133, 0] },
            { name: "Dioxazine Purple", hex: "#3C096C", rgb: [60, 9, 108] },
            { name: "Yellow Ochre", hex: "#B58404", rgb: [181, 132, 4] },
            { name: "Prussian Blue", hex: "#003153", rgb: [0, 49, 83] },
            { name: "Raw Umber", hex: "#826644", rgb: [130, 102, 68] },
            { name: "Cerulean Blue", hex: "#2A52BE", rgb: [42, 82, 190] },
            { name: "Quinacridone", hex: "#8D0C3C", rgb: [141, 12, 60] },
            { name: "Cobalt Teal", hex: "#008B8B", rgb: [0, 139, 139] },
            { name: "Sap Green", hex: "#507D2A", rgb: [80, 125, 42] }
        ];
        this.maxSize = 1200; // Increased for better detail
        this.basePaletteSize = 16;
        this.zoomStep = 0.2;
        this.maxZoom = 4.0;
        this.minZoom = 0.5;
    }

    initState() {
        this.checkedIndices = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
        this.autoMixes = [];   
        this.manualMixes = []; 
        this.uploadedImage = null;
        this.zoom = 1.0;
        
        // The core state of the project
        this.targetColors = []; // Array of RGBs the user wants in their project
        this.projectRecipes = []; // The actual mixable versions of targetColors
        
        this.pixelToColorIdx = null;
        this.ignoredHexes = new Set(); // Keep for backward compatibility/UI logic
        this.isSyncingScroll = false;
        
        // Undo/Redo Stacks
        this.history = [];
        this.redoStack = [];
        
        this.highlightedIndex = null;
    }

    initEventListeners() {
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        this.downloadBtn.addEventListener('click', () => this.downloadOutputs());
        this.printBtn.addEventListener('click', () => window.print());
        
        this.zoomInBtn.addEventListener('click', () => this.updateZoom(this.zoom + this.zoomStep));
        this.zoomOutBtn.addEventListener('click', () => this.updateZoom(this.zoom - this.zoomStep));

        this.printWidthInput.addEventListener('change', () => this.recalculateMinArea());
        this.brushSizeInput.addEventListener('change', () => this.recalculateMinArea());

        // Sync Scrolling
        this.isSyncingScroll = false;
        this.clothContainers.forEach(container => {
            container.addEventListener('scroll', (e) => this.handleSyncScroll(e));
        });

        // Interaction Tools
        this.originalCanvas.addEventListener('click', (e) => this.handleRefineClick(e));
        this.originalCanvas.addEventListener('mousemove', (e) => this.handleColorPickerMove(e));
        this.originalCanvas.addEventListener('mouseleave', () => this.pickerHud.classList.add('hidden'));

        this.colorCanvas.addEventListener('click', (e) => this.handleColorDropClick(e));

        this.undoBtn.addEventListener('click', () => this.undo());
        this.redoBtn.addEventListener('click', () => this.redo());
        this.exportSvgBtn.addEventListener('click', () => this.exportAsSVG());
    }

    updateZoom(newZoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.zoomLevelEl.textContent = `${Math.round(this.zoom * 100)}%`;
        
        this.wrappers.forEach(w => {
            const canvas = w.querySelector('canvas');
            if (canvas) {
                w.style.width = `${canvas.width * this.zoom}px`;
                w.style.height = `${canvas.height * this.zoom}px`;
                // Apply scale to ALL canvases in the wrapper
                w.querySelectorAll('canvas').forEach(c => {
                    c.style.transformOrigin = '0 0';
                    c.style.transform = `scale(${this.zoom})`;
                });
            }
        });
    }

    renderAvailableColors() {
        this.availableColorsEl.innerHTML = '';
        this.standardAcrylics.forEach((color, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = `color-option-wrapper ${this.checkedIndices.has(index) ? 'selected' : ''}`;
            
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color.hex;
            
            const label = document.createElement('span');
            label.className = 'color-name-label';
            label.textContent = color.name;
            
            wrapper.onclick = () => {
                if (this.checkedIndices.has(index)) {
                    if (this.checkedIndices.size > 1) this.checkedIndices.delete(index);
                } else {
                    this.checkedIndices.add(index);
                }
                this.renderAvailableColors();
                this.generateMixableSpace();
                if (this.uploadedImage) this.reprocess();
            };
            
            wrapper.appendChild(swatch);
            wrapper.appendChild(label);
            this.availableColorsEl.appendChild(wrapper);
        });
        this.generateMixableSpace();
    }

    generateMixableSpace() {
        const available = Array.from(this.checkedIndices).map(i => this.standardAcrylics[i]);
        
        // Auto (4 parts / 25%)
        this.autoMixes = this.generateNPartMixes(available, 4);

        // Manual (10 parts / 10%)
        this.manualMixes = this.generateNPartMixes(available, 10);
    }

    generateNPartMixes(available, n) {
        const results = [];
        // 1-color
        available.forEach(c => results.push({ rgb: c.rgb, hex: this.rgbToHex(...c.rgb), n, recipe: [{ color: c, parts: n }] }));
        // 2-colors
        for (let i = 0; i < available.length; i++) {
            for (let j = i + 1; j < available.length; j++) {
                for (let p1 = 1; p1 < n; p1++) {
                    const rgb = this.mixRgb([available[i].rgb, available[j].rgb], [p1, n - p1], n);
                    results.push({ rgb, hex: this.rgbToHex(...rgb), n, recipe: [{ color: available[i], parts: p1 }, { color: available[j], parts: n - p1 }] });
                }
            }
        }
        // 3-colors
        if (available.length >= 3) {
            for (let i = 0; i < available.length; i++) {
                for (let j = i + 1; j < available.length; j++) {
                    for (let k = j + 1; k < available.length; k++) {
                        for (let p1 = 1; p1 < n - 1; p1++) {
                            for (let p2 = 1; p1 + p2 < n; p2++) {
                                const p3 = n - p1 - p2;
                                const rgb = this.mixRgb([available[i].rgb, available[j].rgb, available[k].rgb], [p1, p2, p3], n);
                                results.push({ rgb, hex: this.rgbToHex(...rgb), n, recipe: [
                                    { color: available[i], parts: p1 }, { color: available[j], parts: p2 }, { color: available[k], parts: p3 }
                                ]});
                            }
                        }
                    }
                }
            }
        }
        return results;
    }

    mixRgb(colors, parts, n) {
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < colors.length; i++) {
            r += colors[i][0] * (parts[i] / n);
            g += colors[i][1] * (parts[i] / n);
            b += colors[i][2] * (parts[i] / n);
        }
        return [Math.round(r), Math.round(g), Math.round(b)];
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.uploadedImage = img;
                this.targetColors = [];
                
                // One-time automatic extraction
                this.showLoader(true, "Analyzing image structure & dominant tones...");
                
                // Temporary canvas to extract colors
                const canvas = document.createElement('canvas');
                const { width, height } = this.calculateDimensions(img);
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const pixels = ctx.getImageData(0, 0, width, height).data;
                
                // Initial 16 colors
                this.targetColors = this.extractImagePalette(pixels, 16);
                
                this.reprocess();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    reprocess() {
        if (!this.uploadedImage) return;
        this.showLoader(true, "Synchronizing triple-view workspace...");
        this.welcomeMessage.classList.add('hidden');
        
        setTimeout(() => this.processImage(this.uploadedImage), 50);
    }

    processImage(img) {
        let { width, height } = this.calculateDimensions(img);
        this.originalCanvas.width = this.colorCanvas.width = this.outlineCanvas.width = width;
        this.originalCanvas.height = this.colorCanvas.height = this.outlineCanvas.height = height;
        this.originalHighlight.width = this.colorHighlight.width = width;
        this.originalHighlight.height = this.colorHighlight.height = height;

        const ctxOrig = this.originalCanvas.getContext('2d', { willReadFrequently: true });
        ctxOrig.drawImage(img, 0, 0, width, height);
        
        // Transform "Original" into "Precision Preview"
        this.applyPrecisionPreview(ctxOrig, width, height);

        const ctxColor = this.colorCanvas.getContext('2d', { willReadFrequently: true });
        ctxColor.drawImage(img, 0, 0, width, height);
        
        const imageData = ctxColor.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Map Target Colors to the best available mixable recipes
        this.projectRecipes = this.mapToMixableRecipes(this.targetColors);
        if (!this.projectRecipes.length) {
            this.showLoader(false);
            return;
        }
        
        // Map Pixels only to the user-controlled project palette
        this.pixelToColorIdx = new Int32Array(pixels.length / 4);
        for (let i = 0; i < pixels.length; i += 4) {
            const p = [pixels[i], pixels[i+1], pixels[i+2]];
            let minD = Infinity, bIdx = 0;
            this.projectRecipes.forEach((r, idx) => {
                if (r && r.rgb) {
                    const d = this.perceptualDistanceSq(p, r.rgb);
                    if (d < minD) { minD = d; bIdx = idx; }
                }
            });
            this.pixelToColorIdx[i / 4] = bIdx;
        }

        // 4. Painterly Smoothing Pass (Removes artifacts, rounds out shapes)
        this.applyPainterlySmoothing(width, height);

        this.cleanupSmallRegions(width, height);

        for (let i = 0; i < this.pixelToColorIdx.length; i++) {
            const recipe = this.projectRecipes[this.pixelToColorIdx[i]];
            const pi = i * 4;
            pixels[pi] = recipe.rgb[0];
            pixels[pi+1] = recipe.rgb[1];
            pixels[pi+2] = recipe.rgb[2];
        }

        ctxColor.putImageData(imageData, 0, 0);
        this.generateOutline(width, height);
        this.updateRecipeDisplay();
        
        this.showLoader(false);
        this.splitView.classList.remove('hidden');
        this.postProcessActions.classList.remove('hidden');

        // Update Undo/Redo button states
        this.undoBtn.disabled = this.history.length === 0;
        this.redoBtn.disabled = this.redoStack.length === 0;

        if (this.highlightedIndex !== null) this.updateHighlight();
    }

    calculateDimensions(img) {
        let w = img.width, h = img.height;
        if (w > h) { if (w > this.maxSize) { h *= this.maxSize / w; w = this.maxSize; } }
        else { if (h > this.maxSize) { w *= this.maxSize / h; h = this.maxSize; } }
        return { width: Math.round(w), height: Math.round(h) };
    }

    extractImagePalette(pixels, count) {
        const points = [];
        for (let i = 0; i < pixels.length; i += 100) points.push([pixels[i], pixels[i+1], pixels[i+2]]);
        
        // Smart initialization: Ensure starting centroids are unique
        let centroids = [];
        const usedStartupPoints = new Set();
        
        while (centroids.length < count) {
            const p = points[Math.floor(Math.random() * points.length)];
            const hex = this.rgbToHex(...p);
            if (!usedStartupPoints.has(hex)) {
                centroids.push([...p]);
                usedStartupPoints.add(hex);
            }
        }

        for (let it = 0; it < 5; it++) {
            const cl = Array.from({ length: count }, () => []);
            points.forEach(p => {
                let mD = Infinity, b = 0;
                centroids.forEach((c, idx) => { const d = this.perceptualDistanceSq(p, c); if (d < mD) { mD = d; b = idx; } });
                cl[b].push(p);
            });
            centroids = cl.map((cList, i) => {
                if (!cList.length) return centroids[i];
                const sum = cList.reduce((a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]], [0,0,0]);
                return sum.map(v => Math.round(v / cList.length));
            });
        }
        return centroids;
    }

    mapToMixableRecipes(targetColors) {
        const recipes = [];
        targetColors.forEach((rgb, idx) => {
            // Index 0-15 were auto-extracted (use 25% rule), others are manual (use 10%)
            const pool = idx < 16 ? this.autoMixes : this.manualMixes;
            let minD = Infinity, best = pool[0];
            pool.forEach(mix => {
                const d = this.perceptualDistanceSq(rgb, mix.rgb);
                if (d < minD) { minD = d; best = mix; }
            });
            recipes.push(best);
        });
        return recipes;
    }

    generateOutline(width, height) {
        const ctx = this.outlineCanvas.getContext('2d');
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height);
        const imgD = ctx.getImageData(0, 0, width, height);
        const pixs = imgD.data;

        // Trace edges
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const c = this.pixelToColorIdx[i];
                let edge = false;
                if (x < width-1 && this.pixelToColorIdx[i+1] !== c) edge = true;
                if (y < height-1 && this.pixelToColorIdx[i+width] !== c) edge = true;
                if (edge) { const pi = i*4; pixs[pi] = pixs[pi+1] = pixs[pi+2] = 120; }
            }
        }
        ctx.putImageData(imgD, 0, 0);
        
        // Advanced Label Placement (Centroids)
        this.placeLabels(ctx, width, height);
    }

    placeLabels(ctx, width, height) {
        const data = this.pixelToColorIdx;
        const visited = new Uint8ClampedArray(width * height);
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < data.length; i++) {
            if (visited[i]) continue;
            
            const colorIdx = data[i];
            const region = [];
            const queue = [i];
            visited[i] = 1;
            
            let sumX = 0, sumY = 0;
            
            while (queue.length > 0) {
                const curr = queue.shift();
                region.push(curr);
                const x = curr % width;
                const y = (curr / width) | 0;
                sumX += x; sumY += y;
                
                const adj = [curr-1, curr+1, curr-width, curr+width];
                for (const next of adj) {
                    if (next >= 0 && next < data.length && !visited[next] && data[next] === colorIdx) {
                        const nx = next % width;
                        if (Math.abs(nx - x) <= 1) { // Same region
                            visited[next] = 1;
                            queue.push(next);
                        }
                    }
                }
            }
            
            if (region.length > 50) { // Only label visible areas
                const cx = sumX / region.length;
                const cy = sumY / region.length;
                
                // Verify centroid is inside region for complex shapes
                let target = (Math.round(cy) * width + Math.round(cx));
                if (data[target] === colorIdx) {
                    ctx.fillText(colorIdx + 1, cx, cy);
                } else {
                    // Fallback to a random point in the region if centroid is outside
                    const p = region[Math.floor(region.length / 2)];
                    ctx.fillText(colorIdx + 1, p % width, (p / width) | 0);
                }
            }
        }
    }

    updateRecipeDisplay() {
        this.recipeList.innerHTML = '';
        this.recipeCountBadge.textContent = `${this.projectRecipes.length} Colors`;
        this.projectRecipes.forEach((r, idx) => {
            const item = document.createElement('div');
            item.className = 'recipe-item' + (this.highlightedIndex === idx ? ' highlighted' : '');
            item.title = "Click to highlight, Right click to remove";
            
            item.onclick = () => this.toggleHighlight(idx);
            item.oncontextmenu = (e) => {
                e.preventDefault();
                this.pushHistory();
                this.targetColors.splice(idx, 1);
                this.reprocess();
            };
            let mix = r.recipe.map(p => `
                <div class="mix-part">
                    <span class="mix-dot" style="background-color: ${p.color.hex}"></span>
                    <span>${p.parts}/${r.n} ${p.color.name.split(' ')[0]}</span>
                </div>
            `).join('');
            item.innerHTML = `
                <div class="result-swatch" style="background-color: ${r.hex}">${idx+1}</div>
                <div class="recipe-details"><div class="recipe-mix">${mix}</div></div>
            `;
            this.recipeList.appendChild(item);
        });
    }

    handleColorDropClick(e) {
        if (!this.projectRecipes.length) return;
        const rect = this.colorCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.zoom);
        const y = Math.floor((e.clientY - rect.top) / this.zoom);
        const colorIdx = this.pixelToColorIdx[y * this.colorCanvas.width + x];
        
        // Remove the target color that resulted in this pixel's color
        this.targetColors.splice(colorIdx, 1);
        this.reprocess();
    }

    applyPrecisionPreview(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const result = new Uint8ClampedArray(pixels.length);
        
        // Performance cache: Map quantized tones to their best mix
        // Quantizing to 32 steps (8/256) drastically reduces unique calculations
        const cache = new Map();

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r=0, g=0, b=0, count=0;
                // Simplified 3x3 Blur
                for (let dy = -1; dy <= 1; dy++) {
                    const ny = y + dy;
                    if (ny < 0 || ny >= height) continue;
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        if (nx < 0 || nx >= width) continue;
                        const ii = (ny * width + nx) * 4;
                        r += pixels[ii]; g += pixels[ii+1]; b += pixels[ii+2];
                        count++;
                    }
                }
                
                const avgR = r / count, avgG = g / count, avgB = b / count;
                const i = (y * width + x) * 4;

                // Cache Key (quantized to 8-unit steps)
                const qr = Math.round(avgR / 8) * 8;
                const qg = Math.round(avgG / 8) * 8;
                const qb = Math.round(avgB / 8) * 8;
                const key = (qr << 16) | (qg << 8) | qb;

                let bestRgb;
                if (cache.has(key)) {
                    bestRgb = cache.get(key);
                } else {
                    let minD = Infinity;
                    bestRgb = this.manualMixes[0].rgb;
                    
                    // The bottleneck: Heavy perceptual search
                    for (let m = 0; m < this.manualMixes.length; m++) {
                        const mix = this.manualMixes[m];
                        const d = this.perceptualDistanceSq([avgR, avgG, avgB], mix.rgb);
                        if (d < minD) { 
                            minD = d; 
                            bestRgb = mix.rgb;
                            // Early exit for extremely close matches
                            if (d < 10) break;
                        }
                    }
                    cache.set(key, bestRgb);
                }

                result[i] = bestRgb[0];
                result[i+1] = bestRgb[1];
                result[i+2] = bestRgb[2];
                result[i+3] = 255;
            }
        }
        ctx.putImageData(new ImageData(result, width, height), 0, 0);
    }

    handleColorPickerMove(e) {
        if (!this.uploadedImage) return;
        
        const rect = this.originalCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.zoom);
        const y = Math.floor((e.clientY - rect.top) / this.zoom);
        
        if (x < 0 || y < 0 || x >= this.originalCanvas.width || y >= this.originalCanvas.height) {
            this.pickerHud.classList.add('hidden');
            return;
        }

        const ctx = this.originalCanvas.getContext('2d');
        const rgb = this.getSmartSample(ctx, x, y);
        const hex = this.rgbToHex(...rgb);

        // Find closest mixable recipe - USE 10% RULE FOR HUD
        let minD = Infinity;
        let bestMix = null;
        this.manualMixes.forEach(mix => {
            const d = this.perceptualDistanceSq(rgb, mix.rgb);
            if (d < minD) { minD = d; bestMix = mix; }
        });

        // Update HUD
        this.pickerHud.classList.remove('hidden');
        this.pickerHud.style.left = `${e.clientX}px`;
        this.pickerHud.style.top = `${e.clientY}px`;
        this.hudSwatch.style.backgroundColor = hex;
        this.hudName.textContent = hex.toUpperCase();
        
        const recipeText = `${bestMix.n} pts: ` + bestMix.recipe.map(p => `${p.parts} ${p.color.name.split(' ')[0]}`).join(' / ');
        this.hudRecipe.textContent = recipeText;
    }

    handleRefineClick(e) {
        const rect = this.originalCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.zoom);
        const y = Math.floor((e.clientY - rect.top) / this.zoom);
        
        const ctx = this.originalCanvas.getContext('2d');
        const rgb = this.getSmartSample(ctx, x, y);
        
        this.pushHistory();
        this.targetColors.push(rgb);
        this.reprocess();
    }

    pushHistory() {
        this.history.push(JSON.stringify(this.targetColors));
        this.redoStack = [];
        if (this.history.length > 50) this.history.shift();
    }

    undo() {
        if (!this.history.length) return;
        this.redoStack.push(JSON.stringify(this.targetColors));
        this.targetColors = JSON.parse(this.history.pop());
        this.reprocess();
    }

    redo() {
        if (!this.redoStack.length) return;
        this.history.push(JSON.stringify(this.targetColors));
        this.targetColors = JSON.parse(this.redoStack.pop());
        this.reprocess();
    }

    toggleHighlight(idx) {
        if (this.highlightedIndex === idx) {
            this.highlightedIndex = null;
        } else {
            this.highlightedIndex = idx;
        }
        this.updateRecipeDisplay();
        this.updateHighlight();
    }

    updateHighlight() {
        const w = this.colorCanvas.width, h = this.colorCanvas.height;
        const ctxO = this.originalHighlight.getContext('2d');
        const ctxC = this.colorHighlight.getContext('2d');
        
        ctxO.clearRect(0,0,w,h);
        ctxC.clearRect(0,0,w,h);

        if (this.highlightedIndex === null) {
            this.originalHighlight.classList.remove('active');
            this.colorHighlight.classList.remove('active');
            return;
        }

        this.originalHighlight.classList.add('active');
        this.colorHighlight.classList.add('active');

        const highlightColor = this.projectRecipes[this.highlightedIndex].hex;
        
        // Final pixel data for highlights
        const imgDO = ctxO.createImageData(w, h);
        const imgDC = ctxC.createImageData(w, h);
        const dataO = imgDO.data;
        const dataC = imgDC.data;

        for (let i = 0; i < this.pixelToColorIdx.length; i++) {
            if (this.pixelToColorIdx[i] === this.highlightedIndex) {
                const pi = i * 4;
                dataO[pi] = dataC[pi] = 255;
                dataO[pi+1] = dataC[pi+1] = 255;
                dataO[pi+2] = dataC[pi+2] = 255;
                dataO[pi+3] = dataC[pi+3] = 255;
            }
        }
        ctxO.putImageData(imgDO, 0, 0);
        ctxC.putImageData(imgDC, 0, 0);
    }

    exportAsSVG() {
        const w = this.colorCanvas.width, h = this.colorCanvas.height;
        let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
        
        this.projectRecipes.forEach((recipe, idx) => {
            const pathData = this.traceRegion(idx, w, h);
            if (pathData) {
                svg += `<path d="${pathData}" fill="${recipe.hex}" stroke="none" />`;
            }
        });

        svg += `</svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chromacraft_design.svg`;
        a.click();
    }

    traceRegion(idx, w, h) {
        // Simplified SVG tracing logic: scanline segments
        // In a real-world app, we'd use Marching Squares or Potrace
        let paths = "";
        for (let y = 0; y < h; y++) {
            let start = -1;
            for (let x = 0; x < w; x++) {
                const active = this.pixelToColorIdx[y * w + x] === idx;
                if (active && start === -1) start = x;
                else if (!active && start !== -1) {
                    paths += `M${start},${y}H${x}V${y+1}H${start}Z `;
                    start = -1;
                }
            }
            if (start !== -1) paths += `M${start},${y}H${w}V${y+1}H${start}Z `;
        }
        return paths;
    }

    /**
     * Samples a 3x3 area and returns the average color.
     * This removes noise and prevents outlier pixels from ruining the palette.
     */
    getSmartSample(ctx, x, y) {
        const radius = 1; // 3x3 area
        const imageData = ctx.getImageData(x - radius, y - radius, 3, 3);
        const pixels = imageData.data;
        
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            // Check if we have alpha (to handle edges)
            if (pixels[i+3] > 0) {
                // Use perceptual weighting if averaging for sampling
                r += pixels[i];
                g += pixels[i+1];
                b += pixels[i+2];
                count++;
            }
        }

        if (count === 0) return [0, 0, 0];
        return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
    }

    /**
     * Perceptual color distance (Human-aligned)
     * Uses Red-mean weighted Euclidean distance which approximates LAB 
     * but is much faster for real-time per-pixel processing.
     */
    perceptualDistanceSq(p1, p2) {
        const r1 = p1[0], g1 = p1[1], b1 = p1[2];
        const r2 = p2[0], g2 = p2[1], b2 = p2[2];
        
        const rMean = (r1 + r2) / 2;
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        
        // Weighting factors based on human vision sensitivity
        const wR = 2 + rMean / 256;
        const wG = 4;
        const wB = 2 + (255 - rMean) / 256;
        
        return wR * dr * dr + wG * dg * dg + wB * db * db;
    }

    handleSyncScroll(e) {
        if (this.isSyncingScroll) return;
        this.isSyncingScroll = true;

        const { scrollTop, scrollLeft } = e.target;
        this.clothContainers.forEach(container => {
            if (container !== e.target) {
                container.scrollTop = scrollTop;
                container.scrollLeft = scrollLeft;
            }
        });

        // Use a timeout to prevent infinite scroll loops
        timeout: setTimeout(() => {
            this.isSyncingScroll = false;
        }, 50);
    }

    /**
     * Majority-vote smoothing (Median Filter for indices)
     * This rounds out regions and eliminates JPEG/pixelation noise.
     */
    applyPainterlySmoothing(width, height) {
        const data = this.pixelToColorIdx;
        const result = new Int32Array(data.length);
        const radius = 2; // 5x5 neighborhood

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const histogram = new Map();
                let maxCount = 0;
                let majorityIdx = data[y * width + x];

                // Sample neighborhood
                for (let dy = -radius; dy <= radius; dy++) {
                    const ny = y + dy;
                    if (ny < 0 || ny >= height) continue;
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        if (nx < 0 || nx >= width) continue;

                        const val = data[ny * width + nx];
                        const count = (histogram.get(val) || 0) + 1;
                        histogram.set(val, count);

                        if (count > maxCount) {
                            maxCount = count;
                            majorityIdx = val;
                        }
                    }
                }
                result[y * width + x] = majorityIdx;
            }
        }
        this.pixelToColorIdx.set(result);
    }

    recalculateMinArea() {
        if (!this.pixelToColorIdx) return;
        const widthPx = this.colorCanvas.width;
        const widthCm = parseFloat(this.printWidthInput.value);
        const brushMm = parseFloat(this.brushSizeInput.value);
        
        const pxPerMm = (widthPx / (widthCm * 10));
        // Smallest area is roughly a circle/square of brush diameter
        const minAreaPx = Math.ceil(Math.pow(brushMm * pxPerMm, 2));
        
        this.minAreaEl.textContent = minAreaPx;
        return minAreaPx;
    }

    cleanupSmallRegions(width, height) {
        const minArea = this.recalculateMinArea() || 0;
        if (minArea <= 1) return;

        const visited = new Uint8Array(width * height);
        const data = this.pixelToColorIdx;

        for (let i = 0; i < data.length; i++) {
            if (visited[i]) continue;

            const region = [];
            const stack = [i];
            const colorIdx = data[i];
            visited[i] = 1;

            let neighbors = new Set();

            while (stack.length > 0) {
                const curr = stack.pop();
                region.push(curr);

                const x = curr % width;
                const y = Math.floor(curr / width);

                const adj = [
                    y > 0 ? curr - width : -1,
                    y < height - 1 ? curr + width : -1,
                    x > 0 ? curr - 1 : -1,
                    x < width - 1 ? curr + 1 : -1
                ];

                for (const next of adj) {
                    if (next === -1) continue;
                    if (data[next] === colorIdx) {
                        if (!visited[next]) {
                            visited[next] = 1;
                            stack.push(next);
                        }
                    } else {
                        neighbors.add(data[next]);
                    }
                }
            }

            if (region.length < minArea && neighbors.size > 0) {
                // Find the perceptually closest neighbor to merge into
                const currentColor = this.projectRecipes[colorIdx].rgb;
                let minD = Infinity;
                let bestNeighbor = Array.from(neighbors)[0];

                neighbors.forEach(nIdx => {
                    const nColor = this.projectRecipes[nIdx].rgb;
                    const d = this.perceptualDistanceSq(currentColor, nColor);
                    if (d < minD) {
                        minD = d;
                        bestNeighbor = nIdx;
                    }
                });

                for (const idx of region) {
                    data[idx] = bestNeighbor;
                }
            }
        }
    }

    rgbToHex(r, g, b) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
    showLoader(s, t="") { this.loader.classList.toggle('hidden', !s); if(t) this.loaderText.textContent = t; }
    downloadOutputs() { /* same as before */ }
}

new ChromaCraftPro();
