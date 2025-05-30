import { subscribe } from '../state/store.js';

const label = document.getElementById('hoverLabel');

subscribe(s => {
  label.textContent = s.hoveredCell ? `Cell ID: ${s.hoveredCell}` : 'Hover a cell';
});
