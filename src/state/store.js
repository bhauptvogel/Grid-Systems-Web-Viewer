const state = {
	activeGridSystem: 'slippy', // options: slippy, h3, quadtree, geohash
	mapCenter: [1288648, 6129703], // munich
	mapZoom: 5,
	selectedCells: [],
	hoveredCell: '',
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
