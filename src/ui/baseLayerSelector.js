import { BASEMAPS } from '../basemaps.js';
import { getState, setState, subscribe } from '../state/store.js';

const select = document.getElementById('basemapSelect');
if (!select) throw new Error('<select id="basemapSelect"> missing!');

Object.entries(BASEMAPS).forEach(([id, { label }]) => {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = label;
  select.appendChild(opt);
});

select.value = getState().activeBaseLayer;
select.addEventListener('change', () => setState({ activeBaseLayer: select.value }));

subscribe(({ activeBaseLayer }) => {
  if (select.value !== activeBaseLayer) select.value = activeBaseLayer;
});

