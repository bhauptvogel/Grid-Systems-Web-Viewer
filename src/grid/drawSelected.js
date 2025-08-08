import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import { Fill, Stroke, Style } from 'ol/style.js';

import { getState, subscribe } from '../state/store.js';
import { getGridSystem }       from './index.js';

const selectedStyle = new Style({
  fill  : new Fill({ color: 'rgba(255,0,0,0.30)' }),
  stroke: new Stroke({ color: 'rgba(255,0,0,1)', width: 2 }),
});

// Render all currently selected cells to the given vector source.
function drawSelected ({ selectedSource }) {
  const { selectedCells, activeGridSystem } = getState();

  selectedSource.clear();
  if (!selectedCells?.length) return; // nothing to draw

  const grid = getGridSystem(activeGridSystem);
  const features = selectedCells.map((id) => new Feature(new Polygon(grid.decode(id))));

  features.forEach((f) => f.setStyle(selectedStyle));
  selectedSource.addFeatures(features);
}

// Subscribe to store changes and redraw the selected features efficiently only when `selectedCells` or the active grid changes.
export function registerSelectedRenderer ({ selectedSource }) {
  let prevCells = getState().selectedCells;
  let prevGrid  = getState().activeGridSystem;

  // initial paint
  drawSelected({ selectedSource });

  return subscribe((state) => {
    const cellsChanged = state.selectedCells !== prevCells;
    const gridChanged  = state.activeGridSystem !== prevGrid;

    if (cellsChanged || gridChanged) {
      prevCells = state.selectedCells;
      prevGrid  = state.activeGridSystem;
      drawSelected({ selectedSource });
    }
  });
}

