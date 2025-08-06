import { fromLonLat }   from 'ol/proj.js';
import { boundingExtent } from 'ol/extent.js';

import { getState, setState }   from '../state/store.js';
import { getGridSystem }        from '../grid/index.js';
import { showToast }            from '../ui/toast.js';

export function registerSearchEvents ({ map, view }) {
  /* coordinate search ------------------------------------------------- */
  document.addEventListener('app:searchCoordinate', ({ detail:{ lat, lon } }) =>
    view.animate({ center: fromLonLat([lon, lat]), duration: 400 })
  );

  /* cell search ------------------------------------------------------- */
  document.addEventListener('app:searchCell', ({ detail:{ cellId } }) => {
    try {
      const grid = getGridSystem(getState().activeGridSystem);
      const ring = (() => {
        const geom = grid.decode(cellId);
        return Array.isArray(geom[0][0]) ? geom[0] : geom;
      })();

      /* centre & padded extent */
      const center = ring.reduce(([sx,sy],[x,y]) => [sx+x, sy+y], [0,0])
                         .map(v => v/ring.length);

      const ext  = boundingExtent(ring),
            pad  = [ext[0]-(ext[2]-ext[0]), ext[1]-(ext[3]-ext[1]),
                    ext[2]+(ext[2]-ext[0]), ext[3]+(ext[3]-ext[1])];

      const res  = view.getResolutionForExtent(pad, map.getSize());
      const zoom = Math.min(view.getMaxZoom(),
                            Math.round(view.getZoomForResolution(res)*2)/2);

      view.animate({ center, zoom, duration: 250 });

      /* select tile */
      const { selectedCells } = getState();
      if (!selectedCells.includes(cellId))
        setState({ selectedCells: [...selectedCells, cellId] });

    } catch {
      showToast(`Could not locate “${cellId}”.\nDoes it match the active grid?`);
    }
  });
}

