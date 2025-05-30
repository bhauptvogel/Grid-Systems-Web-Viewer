import { getState, setState, subscribe } from '../state/store.js';

const select = document.getElementById('gridSelect');

// sync initial value (needed if main.js sets a different default)
select.value = getState().activeGridSystem;

select.addEventListener('change', () => {
  setState({ activeGridSystem: select.value, selectedCells: [], hoveredCell: '' });
});

// keep <select> in sync if state changes elsewhere
subscribe(s => { if (select.value !== s.activeGridSystem) select.value = s.activeGridSystem; });

