import { drawTools } from '../drawTools.js';
import { subscribe } from '../state/store.js';

let currentActiveBtn = null;

function setActiveButton(id) {
  if (currentActiveBtn) {
    currentActiveBtn.classList.remove('active-draw');
  }
  const btn = document.getElementById(id);
  if (btn) {
    btn.classList.add('active-draw');
    currentActiveBtn = btn;
  }
}

function clearActiveButton() {
  if (currentActiveBtn) {
    currentActiveBtn.classList.remove('active-draw');
    currentActiveBtn = null;
  }
}

subscribe(({ isDrawing }) => {
  if (!isDrawing) clearActiveButton();
});

// Draw modes --------------------------------------------------------------
function bind(id, fn) {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', fn);
}

function toggleDrawMode(buttonId, mode) {
  if (currentActiveBtn?.id === buttonId) {
		drawTools.stopCurrentInteraction();
    clearActiveButton();
  } else {
    drawTools.activate(mode);
    setActiveButton(buttonId);
  }
}

bind('btnLine',   () => toggleDrawMode('btnLine', 'line'));
bind('btnPoly',   () => toggleDrawMode('btnPoly', 'polygon'));
bind('btnRect',   () => toggleDrawMode('btnRect', 'rectangle'));
bind('btnCircle', () => toggleDrawMode('btnCircle', 'circle'));
// Search ------------------------------------------------------------------
const SEARCH_INPUT_ID = 'toolbarSearchInput';
bind('btnSearch', () => {

	const input = document.getElementById(SEARCH_INPUT_ID);
  if (!input) return;            // should never happen

  input.classList.toggle('hidden');
  if (!input.classList.contains('hidden')) {
    input.focus();
    input.select();
  }
});
function performSearch(query) {
	if (!query) return;
	drawTools.reset();

  // 1) coordinate search  (lat,lon   or   lon,lat)
  const m = query.match(
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*)$/
  );
  if (m) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    document.dispatchEvent(
      new CustomEvent("app:searchCoordinate", { detail: { lat, lon } })
    );
  } else {
		// 2) assume “cell id”
		document.dispatchEvent(
			new CustomEvent("app:searchCell", { detail: { cellId: query } })
		);
	}

}
document.getElementById(SEARCH_INPUT_ID)
  .addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch(e.target.value.trim());
      e.target.value = '';
      e.target.classList.add('hidden');
    }
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


