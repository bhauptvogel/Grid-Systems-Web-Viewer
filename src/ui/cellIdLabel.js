import { subscribe } from '../state/store.js';

const label = document.getElementById('hoverLabel');

subscribe(s => {
  label.textContent = s.hoveredCell ? `Cell: ${s.hoveredCell}` : 'Hover a cell';
});
