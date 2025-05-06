import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj';
import Polygon from 'ol/geom/Polygon.js';
import Feature from 'ol/Feature.js'
import VectorSource from 'ol/source/Vector.js';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';

// const westernMostCampusLon = 13.31992;
// const easternMostCampusLon = 13.33433;
// const northernMostCampusLat = 52.51716;
// const southernMostCampusLat = 52.50729;
// 
// const tuCenterCoordinates = fromLonLat([(westernMostCampusLon + easternMostCampusLon)/2, (northernMostCampusLat + southernMostCampusLat)/2]);
// 
// const tuBoundingBox = new Polygon(
// 	[[
// 		fromLonLat([westernMostCampusLon, northernMostCampusLat]),
// 		fromLonLat([easternMostCampusLon, northernMostCampusLat]),
// 		fromLonLat([easternMostCampusLon, southernMostCampusLat]),
// 		fromLonLat([westernMostCampusLon, southernMostCampusLat]),
// 		fromLonLat([westernMostCampusLon, northernMostCampusLat]),
// 	]])
// 
// const tuBoxFeature = new Feature(tuBoundingBox);
// tuBoxFeature.setStyle(
//   new Style({
//     stroke: new Stroke({
//       color: 'red',
//       width: 2,
//     }),
//     fill: new Fill({
//       color: 'rgba(255, 0, 0, 0.1)',
//     }),
//   })
// );


const map = new Map({
  target: 'map', 
  layers: [
    new TileLayer({
			source: new OSM(),
    }),
  ],
  view: new View({
    center: [0,0],
    zoom: 2,
  }),
});

