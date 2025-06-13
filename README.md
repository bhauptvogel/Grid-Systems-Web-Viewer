# Grid Visualizer

A lightweight web application to visualize grid systems (e.g. H3, Geohash, Slippy tiles) on an interactive map using vanilla JavaScript and OpenLayers.

## 🚀 Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
````

## 📦 Build and run

```bash
npm run build
npx serve dist
```

## 📁 Project Structure (Top-Level)

* `src/`
  * `grid/` – Grid system implementations and utility logic.
  * `state/` – Centralized app state management (e.g. selected cells, current grid system).
  * `ui/` – User interface components like cell selection, grid system selection, and cell id label.
  * `styles/` – CSS styles used across the app.
  * `main.js` – Entry point that initializes the app and handles the grid rendering.