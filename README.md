# 🎨 ChromaCraft Pro
### Advanced Artist Workspace for Precision Paint-by-Number Design

ChromaCraft Pro is a high-fidelity web application designed for traditional painters who want to convert digital images into professional-grade paint-by-number blueprints. Unlike generic converters, ChromaCraft Pro uses **Perceptual Color Science** and a **Physical Constraint Engine** to ensure every generated design is realistic, mixable, and paintable with real-world materials.

![ChromaCraft Pro Preview](https://github-production-user-asset-6210df.s3.amazonaws.com/placeholder-preview.png)

---

## 🚀 Key Features

### 🔬 Perceptual Color Engine
*   **Human-Aligned Matching**: Uses Red-mean weighted Euclidean distance to match colors based on human eye sensitivity rather than raw data.
*   **Precision Mixing Recipes**: Generates specific mixing ratios (e.g., *2 parts Cobalt Teal / 8 parts White*) using 10% or 25% precision rules.
*   **Professional Studio**: Pre-loaded with a curated selection of 16+ professional acrylic colors including Quinacridone, Phthalo Blue, and Sap Green.

### 🖌️ Artist-First Workflow
*   **Triple-View Workspace**:
    1.  **Precision Preview**: A "feasibility map" showing exactly what colors are pickable after a smart noise-reduction pass.
    2.  **Design Reference**: The simplified, segmented work-in-progress.
    3.  **Outline Map**: The final numbered blueprint ready for printing.
*   **Deterministic Control**: The software never "guesses." You have full control to manually add highlights or remove colors from the project palette.
*   **Painterly Smoothing**: An integrated oil-paint filter that rounds out areas into natural "brush strokes," eliminating JPEG artifacts and pixelation.

### 📐 Physical Constraint Engine
*   **Brush-Size Validation**: Enter your print dimensions and smallest brush size (mm); the engine automatically merges areas that are too small to physically paint.
*   **Synchronized Zoom & Pan**: Perfect lock-step navigation across all three views for detailed inspection.
*   **Color Picker HUD**: Real-time hover information showing the resulting mix for any point on the image.

### 🖨️ Production Ready
*   **Smart Printing**: One-click printing that isolates the black & white outline map, hides the UI, and scales perfectly to paper to save ink and provide a clean blueprint.
*   **Fluent 2 Design**: A modern, compact, high-density interface built on Microsoft's Fluent 2 principles with mica-inspired aesthetics.

---

## 🛠️ Technology Stack

*   **Logic**: Vanilla JavaScript (ES6+)
*   **Rendering**: HTML5 Canvas API (optimized for per-pixel operations)
*   **Styling**: Pure CSS (Fluent 2 Design Language)
*   **Architecture**: State-driven component design with no external dependencies.

---

## 📖 How to Use

1.  **Setup Canvas**: Enter your intended **Print Width (cm)** and your **Smallest Brush (mm)**.
2.  **Select Inventory**: Check the paints you actually have in your physical studio.
3.  **Upload Image**: The engine will automatically extract the 16 most dominant colors.
4.  **Refine**: Click the **Precision Preview** (left panel) to add specific highlights or subtle tones you want to include.
5.  **Clean up**: Click a color in the sidebar or on the color map to remove it if it feels redundant.
6.  **Print**: Click the **Print Blueprint** button to get your physical guide.

---

## 📜 Development Notes

*   **Performance**: Uses a quantized color cache to perform over 20,000 perceptual calculations per pixel without browser timeouts.
*   **Rounding**: Implements Majority-Vote filtering for organic shape-building.
*   **License**: MIT License.

---

*Designed for artists, by artists.*
