import { getState, setState, subscribe } from '../state/store.js';
import { gridLabels } from '../grid/index.js';

const select = document.getElementById('gridSelect');

// build <option> list
select.innerHTML = '';
for (const [id, label] of Object.entries(gridLabels)) {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = label;
  select.appendChild(opt);
}

// keep store <-> UI in sync
select.value = getState().activeGridSystem;
select.addEventListener('change', e =>
  setState({ activeGridSystem: e.target.value, selectedCells: [], precisionLocked: false, hoveredCells: '' })
);

// keep <select> in sync if state changes elsewhere
subscribe(s => { if (select.value !== s.activeGridSystem) select.value = s.activeGridSystem; });

