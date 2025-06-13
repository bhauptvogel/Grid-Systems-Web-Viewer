const state = {
	activeGridSystem: 'h3', // options: slippy, h3, quadtree, geohash
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
