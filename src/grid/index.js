import { GRID_CATALOG } from './registry.js';

export const gridRegistry = Object.fromEntries(
  Object.entries(GRID_CATALOG).map(([key, { class: GridClass }]) => [
    key,
    new GridClass(),
  ]),
);

export const getGridSystem = (key) => {
  const grid = gridRegistry[key];
  if (!grid) throw new Error(`Invalid grid system "${key}"`);
  return grid;
};

export const gridLabels = Object.fromEntries(
  Object.entries(GRID_CATALOG).map(([key, { label }]) => [key, label]),
);
