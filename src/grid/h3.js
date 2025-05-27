import {latLngToCell, polygonToCells, cellToBoundary} from "h3-js";
import {toLonLat,fromLonLat} from 'ol/proj';

// TODO: add to helpers
function getCurrentExtentPolygon(extent) {
  const bottomLeft = toLonLat([extent[0], extent[1]]);
  const bottomRight = toLonLat([extent[2], extent[1]]);
  const topRight = toLonLat([extent[2], extent[3]]);
  const topLeft = toLonLat([extent[0], extent[3]]);

  return [[
    [bottomLeft[0], bottomLeft[1]],
    [bottomRight[0], bottomRight[1]],
    [topRight[0], topRight[1]],
    [topLeft[0], topLeft[1]],
    [bottomLeft[0], bottomLeft[1]] 
  ]];
}

// use h3-js
export class UberH3Grid {
	constructor(map) { this.map = map };
	_resolution() {
		const z = Math.floor(this.map.getView().getZoom());
		if (z < 3) return 0;
		if (z >= 23) return 15;
		return Math.floor((z - 2) * 0.75);
	}
	gridPolygons() {
		// TODO: Bug - at far zoom - not or wrongly shown grid
		// TODO: Bug - at edges - grid wrongly shown
		const view = this.map.getView();
		const viewExtent = view.calculateExtent(this.map.getSize());
		const polygonExtent = getCurrentExtentPolygon(viewExtent);
		const resolution = this._resolution();

		const cells = polygonToCells(polygonExtent, resolution, true);
		const polygons = cells.map(h3Index => cellToBoundary(h3Index, true));
		const convertedPolygons = polygons.map(poly => [poly.map(bound => fromLonLat(bound))]);
		return convertedPolygons;
	}
	getID(coordinates) {
		return latLngToCell(toLonLat(coordinates)[1], toLonLat(coordinates)[0], this._resolution());
	}
	getPolygon(id) {
		const boundary = cellToBoundary(id, true);
		return [cellToBoundary(id, true).map(bound=>fromLonLat(bound))];
	}
}

