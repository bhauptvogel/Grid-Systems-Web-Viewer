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
  * `baselayers/` - Catalogue of rastered background maps.
  * `events/` - Controllers for the map, coordinate/cell search and keyboard shortucts.
  * `draw/` - Interaction for selection tools (e.g. line, polygon, circle).
  * `state/` – Centralized app state management (e.g. selected cells, current grid system).
  * `ui/` – User interface components like cell selection, grid system selection, and cell id label.
  * `styles/` – CSS styles used across the app.
  * `queryParams.js` - URL state synchronisation.
  * `selectionHistory.js` - Undo / Redo stack for selected cells.
  * `main.js` – Entry point that initializes the app.
