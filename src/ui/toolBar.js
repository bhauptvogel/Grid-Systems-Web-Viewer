import { drawTools } from '../drawTools.js';

function bind(id, fn) {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', fn);
}

// Draw modes --------------------------------------------------------------
bind('btnLine',   () => drawTools.activate('line'));
bind('btnPoly',   () => drawTools.activate('polygon'));
bind('btnRect',   () => drawTools.activate('rectangle'));
bind('btnCircle', () => drawTools.activate('circle'));

// Search ------------------------------------------------------------------
bind('btnSearch', () => {
  const q = prompt('Enter "lat,lon" or a tile id');
  if (q) drawTools.search(q);
});

// GeoJSON upload ----------------------------------------------------------
bind('btnUpload', () => {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.geojson,application/geo+json,application/json';
  picker.onchange = () => picker.files?.[0]?.text().then(drawTools.importGeoJSON);
  picker.click();
});

bind('btnReset', () => drawTools.reset());


