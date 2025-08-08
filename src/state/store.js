const state = {
	activeGridSystem: 'slippy', // default options: slippy, h3, quadtree, geohash
	precision: 0,
	precisionLocked: false,
	mapCenter: [1288648, 6129703], // default is centered on munich, coordinates in EPSG:3857
	mapZoom: 5,
	selectedCells: [],
	hoveredCell: '',
	isDrawing: false,
	activeBaseLayer: 'osm',
}

const listeners = new Set();

export function getState() {
	return {...state};
}

export function setState(patch) {
	Object.assign(state, patch);
	listeners.forEach(fn => fn(getState()));
}

export function subscribe(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}
