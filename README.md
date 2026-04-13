<div align="center">

# Grid Visualizer

<img src="./public/screenshot.png" alt="Grid Visualizer Screenshot" width="600">

A lightweight web application to visualize grid systems (e.g. H3, Geohash, Slippy tiles) on an interactive map using vanilla JavaScript and OpenLayers.

</div>

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
  * `state/` – Centralized app state management (e.g. selected cells, current grid system).
  * `ui/` – User interface components like cell selection, grid system selection, and cell id label.
  * `styles/` – CSS styles used across the app.
  * `drawTools.js` - Interaction for selection tools (e.g. line, polygon, circle).
  * `queryParams.js` - URL state synchronisation.
  * `selectionHistory.js` - Undo / Redo stack for selected cells.
  * `main.js` – Entry point that initializes the app.

## 🗺️ Adding a new background rasterization

1. Open `src/baselayers/registry.js` and add an entry:
``` js
export const BASEMAP_CATALOG = {
  // ...
  mytiles: {
    label: 'My Tiles',
    type : 'XYZ', // 'OSM' for default OSM, 'XYZ' for custom URL
    url  : 'https://example.com/tiles/{z}/{x}/{y}.png',
    attribution: '© My Tile Provider',
  },
};
```

## 🌐 Adding a new grid system

1. Create the implementation by adding `src/grid/systems/mygrid.js` and implement the following methods (*mandatory*):
    * `mapToPrecision(view)` - Return an int describing the precision that should be used for the current map view.
    * `polygonToCells(precision, polygon)` - Convert a polygon to an array of cell IDs at the given precision.
    * `encode(precision, lat, lon)` - Encode coordinates and precision to a cell ID string.
    * `decode(id)` - Decode a cell ID string to a polygon representing the cell
2. Register it in `src/grid/registry.js`:
``` js
export const GRID_CATALOG = {
  // ...
  mygrid: { label: 'My Grid', class: MyGrid },
};
```

