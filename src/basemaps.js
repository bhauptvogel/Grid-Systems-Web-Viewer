import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ.js';

export const BASEMAPS = {
  osm: {
    label: 'OSM Standard',
    layer: () => new TileLayer({ source: new OSM() }),
  },
  hot: {
    label: 'Humanitarian Style',
    layer: () =>
      new TileLayer({
        source: new XYZ({
          url: 'https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
					attributions: '© OpenStreetMap contributors, style © HOT / OSM-FR',
          crossOrigin: 'anonymous',
        }),
      }),
  },
  toner: {
    label: 'Stamen Toner',
    layer: () =>
      new TileLayer({
        source: new XYZ({
          url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
					attributions: '© Stamen Design (CC BY 4.0), © OpenStreetMap contributors',
          crossOrigin: 'anonymous',
        }),
      }),
  },
};

