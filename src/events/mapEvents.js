import { toLonLat } from 'ol/proj.js';
import DragPan      from 'ol/interaction/DragPan.js';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom.js';

import { getState, setState } from '../state/store.js';
import { getGridSystem }                 from '../grid/index.js';

export function registerMapEvents ({ map, view }) {
	// Disable double-click zoom
  map.getInteractions().forEach((interaction) => {
    if (interaction instanceof DoubleClickZoom) {
      map.removeInteraction(interaction);
    }
  });

	// Activate right‑mouse button panning
	map.getViewport().addEventListener('contextmenu', (e) => e.preventDefault());
	const rightDragPan = new DragPan({
		condition: (evt) => evt.originalEvent?.button === 2,
	});
	map.addInteraction(rightDragPan);

	// IF WISHED: DEACTIVATE LEFT-MOUSE PANNING HERE

	// Map Move / Zoom - redraw grid
  map.on('moveend', () => setState({ mapCenter: view.getCenter(), mapZoom: view.getZoom() }));

	// Hover – expose the cell under the cursor
  let lastHover = null;
  map.on('pointermove', (evt) => {
    const { precision, activeGridSystem } = getState();
    const [lon, lat] = toLonLat(evt.coordinate);
    const cell = getGridSystem(activeGridSystem).encode(precision, lat, lon);

    if (cell !== lastHover) {
      lastHover = cell;
      setState({ hoveredCell: cell });
    }
  });

	// Click – toggle selection
  map.on('click', (evt) => {
    const state = getState();
    if (state.isDrawing) return;

    const [lon, lat] = toLonLat(evt.coordinate);
    const cell = getGridSystem(state.activeGridSystem).encode(state.precision, lat, lon);

    setState({
      selectedCells: state.selectedCells.includes(cell)
        ? state.selectedCells.filter((id) => id !== cell)
        : [...state.selectedCells, cell],
    });
  });

}

