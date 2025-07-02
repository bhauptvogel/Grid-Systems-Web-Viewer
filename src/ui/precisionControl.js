import { getState, setState, subscribe } from '../state/store.js';


const panel       = document.getElementById('panel-precision');
const valueEl     = document.getElementById('precisionValue');
const minusBtn    = document.getElementById('precisionMinus');
const plusBtn     = document.getElementById('precisionPlus');
const toggleBtn   = document.getElementById('precisionToggle');

const clamp = (v) => Math.max(0, v);

function syncUI() {
  const { precision, precisionLocked } = getState();

  valueEl.textContent = precision;
  panel.classList.toggle('locked', precisionLocked);

  minusBtn.disabled = plusBtn.disabled = !precisionLocked;
  toggleBtn.textContent = precisionLocked ? 'Unlock' : 'Lock';
}

minusBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const { precision, precisionLocked } = getState();
  if (!precisionLocked) return;
  setState({ precision: clamp(precision - 1) });
});

plusBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const { precision, precisionLocked } = getState();
  if (!precisionLocked) return;
  setState({ precision: clamp(precision + 1) });
});

toggleBtn.addEventListener('click', () => {
  const { precisionLocked } = getState();
  setState({ precisionLocked: !precisionLocked });
});

if (getState().precision === undefined) setState({ precision: null });

subscribe(syncUI);
syncUI();






