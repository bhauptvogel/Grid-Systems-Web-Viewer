import TileLayer from 'ol/layer/Tile.js';
import OSM       from 'ol/source/OSM.js';
import XYZ       from 'ol/source/XYZ.js';

import { BASEMAP_CATALOG } from '../baselayers/registry.js';

const sourceFactory = ({ type, url, attribution }) => {
  switch (type) {
    case 'OSM': return new OSM();
    case 'XYZ': return new XYZ({
      url,
      attributions: attribution,
      crossOrigin: 'anonymous',
    });
    default: throw new Error(`Unknown basemap type "${type}"`);
  }
};

export function createBaseLayers(activeId) {
  const layers = Object.fromEntries(
    Object.entries(BASEMAP_CATALOG).map(([id, def]) => [
      id,
      new TileLayer({ source: sourceFactory(def) }),
    ]),
  );

  Object.entries(layers).forEach(([id, layer]) =>
    layer.setVisible(id === activeId),
  );
  return layers;
}

export function watchBaseLayer(layers) {
  let prev = null;
  return (state) => {
    const { activeBaseLayer } = state;
    if (activeBaseLayer === prev) return;
    if (prev && layers[prev]) layers[prev].setVisible(false);
    layers[activeBaseLayer]?.setVisible(true);
    prev = activeBaseLayer;
  };
}

