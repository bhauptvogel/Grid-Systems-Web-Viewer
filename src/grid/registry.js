import { SlippyTilesGrid }  from './systems/slippy.js';
import { GeohashGrid }      from './systems/geohash.js';
import { UberH3Grid }       from './systems/h3.js';
import { QuadTreeGrid }     from './systems/quadtree.js';

export const GRID_CATALOG = {
  slippy   : { label: 'Slippy Tiles', class: SlippyTilesGrid },
  geohash  : { label: 'Geohash',      class: GeohashGrid     },
  h3       : { label: 'Uber H3',      class: UberH3Grid      },
  quadtree : { label: 'Quadtree',     class: QuadTreeGrid    },
};
