export const BASEMAP_CATALOG = {
  osm: {
    label: 'OSM Standard',
    type : 'OSM',
  },
  hot: {
    label: 'Humanitarian',
    type : 'XYZ',
    url  : 'https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, style © HOT / OSM-FR',
  },
  toner: {
    label: 'Stamen Toner',
    type : 'XYZ',
    url  : 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
    attribution: '© Stamen Design (CC BY 4.0), © OpenStreetMap contributors',
  },
};
