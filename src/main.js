import 'ol/ol.css';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import View from 'ol/View';

import { initUrlSync } from './queryParams.js';
import { getState, subscribe } from './state/store.js';

import { createBaseLayers, watchBaseLayer } from './baselayers/index.js';

import { gridRegistry } from './grid/index.js';
import { drawGrid } from './grid/drawGrid.js';
import { drawSelected, registerSelectedRenderer } from './grid/drawSelected.js';

import { drawTools } from './drawTools.js';

import { registerMapEvents } from './events/mapEvents.js';
import { registerSearchEvents } from './events/searchEvents.js';
import { registerKeyboardShortcuts } from './events/keyboardShortcuts.js';

import './ui/gridSelector.js';
import './ui/selectedCellsInput.js';
import './ui/cellIdLabel.js';
import './ui/toolBar.js';
import './ui/precisionControl.js';
import './ui/baseLayerSelector.js';

function boot() {
	/* 1 — keep URL ↔︎ state in sync */
  initUrlSync();

	/* 2 — view & base-maps */
	const baseLayers      = createBaseLayers(getState().activeBaseLayer);
  const baseLayerWatch  = watchBaseLayer(baseLayers);
  subscribe(baseLayerWatch);

	/* 3 - create view */
  const { mapCenter, mapZoom } = getState();
  const view = new View({
    center     : mapCenter,
    zoom       : mapZoom,
    projection : 'EPSG:3857',
    multiWorld : false,
  });

	/* 4 — data layers */
  const gridSource      = new VectorSource({ wrapX: true });
  const selectedSource  = new VectorSource({ wrapX: true });

  /* 5 — create map */
  const map = new Map({
    target : 'map',
    layers : [
      ...Object.values(baseLayers),
      new VectorLayer({ source: gridSource }),
      new VectorLayer({ source: selectedSource }),
    ],
    view,
  });

	
  /* 6 — draw tools */
	drawTools.init({ map, grids: gridRegistry });

  /* 7 — initial grid rendering */
  drawGrid({ map, gridSource });

	/* 8 - initailizing renderer for selected tiles */
	registerSelectedRenderer({ selectedSource });
	drawSelected({ selectedSource });

	/* 9 — event wiring */
  registerMapEvents({ map, view, gridSource, selectedSource });
	registerSearchEvents({ map, view });
  registerKeyboardShortcuts({ map });
}

boot();
