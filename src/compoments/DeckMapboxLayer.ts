const MapboxLayer = require('@deck.gl/mapbox');
const WebMercatorViewport = require('@deck.gl/core');

export class DeckMapboxLayer extends MapboxLayer {
  // Replace MapboxLayer.render to support underground rendering
  render(gl: any, matrix: any) {
    var deck = this.deck;
    var map = this.map;
    var center = map.getCenter();

    if (!deck.layerManager) {
      // Not yet initialized
      return;
    }

    if (!deck.props.userData.currentViewport) {
      deck.props.userData.currentViewport = new WebMercatorViewport({
        x: 0,
        y: 0,
        width: deck.width,
        height: deck.height,
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        nearZMultiplier: 0,
        farZMultiplier: 10,
      });
    }
    render.apply(this, arguments);
  }
}
