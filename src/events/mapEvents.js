import { toLonLat } from 'ol/proj.js';
import Feature      from 'ol/Feature.js';
import Polygon      from 'ol/geom/Polygon.js';
import DragPan      from 'ol/interaction/DragPan.js';

import { getState, setState, subscribe } from '../state/store.js';
import { drawGrid, selectedStyle }       from '../grid/drawGrid.js';
import { getGridSystem }                 from '../grid/index.js';

export function registerMapEvents ({ map, view, gridSource, selectedSource }) {
	/* ────────────────────────────────────────────────────────────────
     *  Right‑mouse button panning
     * ──────────────────────────────────────────────────────────────── */
	map.getViewport().addEventListener('contextmenu', (e) => e.preventDefault());

	const rightDragPan = new DragPan({
		condition: (evt) => evt.originalEvent?.button === 2,
	});
	map.addInteraction(rightDragPan);

	/* ────────────────────────────────────────────────────────────────
   *  1.  Precision ↔︎ Zoom
   *      When zoom changes we might need a new precision (unless the user locked it in the UI)
   * ──────────────────────────────────────────────────────────────── */
  const updatePrecision = () => {
    const state = getState();
    if (state.precisionLocked) return;

    const next = getGridSystem(state.activeGridSystem)
                   .mapToPrecision(view.getZoom());
    if (next !== state.precision) setState({ precision: next });
  };

  /* ────────────────────────────────────────────────────────────────
   *  2.  React to state changes (store → map)
   * ──────────────────────────────────────────────────────────────── */

	/* 1. Precision changed → redraw grid */
  let prevPrecision = getState().precision;
  subscribe((state) => {
    if (state.precision === prevPrecision) return;
    prevPrecision = state.precision;
    drawGrid({ map, gridSource });
  });

	/* 2. Lock flag changed → redraw grid */
  let prevLocked = getState().precisionLocked;
  subscribe((state) => {
    if (state.precisionLocked === prevLocked) return;
    prevLocked = state.precisionLocked;

    if (!state.precisionLocked) updatePrecision();
    drawGrid({ map, gridSource });
  });

  /* 3. Grid system changed → redraw grid & selection */
  let prevGrid = getState().activeGridSystem;
  subscribe((state) => {
    if (state.activeGridSystem === prevGrid) return;
    prevGrid = state.activeGridSystem;

    // compute default precision for the new grid (if unlocked)
    if (!state.precisionLocked) {
      const next = getGridSystem(state.activeGridSystem)
                     .mapToPrecision(view.getZoom());
      if (next !== state.precision) setState({ precision: next });
    }

    drawGrid({ map, gridSource });
    renderSelected();
  });

  /* 4. Selected‑cells array changed → redraw highlights */
  subscribe(renderSelected);
  function renderSelected () {
    const { selectedCells, activeGridSystem } = getState();

    selectedSource.clear();
    const features = selectedCells.map((id) =>
      new Feature(new Polygon(getGridSystem(activeGridSystem).decode(id))),
    );

    features.forEach((f) => f.setStyle(selectedStyle));
    selectedSource.addFeatures(features);
  }

  /* ────────────────────────────────────────────────────────────────
   *  3.  Map events (map → state)
   * ──────────────────────────────────────────────────────────────── */

  /** Persist view on every move / zoom and adjust precision. */
  const persistView = () =>
    setState({ mapCenter: view.getCenter(), mapZoom: view.getZoom() });

  view.on('change:resolution', () => {
    drawGrid({ map, gridSource });
    persistView();
    updatePrecision();
  });

  map.on('moveend', () => {
    drawGrid({ map, gridSource });
    persistView();
    updatePrecision();
  });

  /** Hover – expose the cell under the cursor (for UI highlights/tooltips). */
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

  /** Click – toggle selection on the clicked cell. */
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

  /* ────────────────────────────────────────────────────────────────
   *  4.  Initial paint / sync
   * ──────────────────────────────────────────────────────────────── */
  updatePrecision();
  drawGrid({ map, gridSource });
  renderSelected();
}

