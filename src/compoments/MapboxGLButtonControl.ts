export class MapboxGLButtonControl {
  private _map: any;
  private _container: any;
  private _buttons: any;
  private _options: any;

  constructor(optionArray: any[]) {
    this._options = optionArray.map(function(options) {
      return {
        className: options.className || '',
        title: options.title || '',
        eventHandler: options.eventHandler,
      };
    });
  }

  onAdd(map: any) {
    var me = this;

    me._map = map;

    me._container = document.createElement('div');
    me._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    me._buttons = me._options.map(function(options: any) {
      var button = document.createElement('button');

      button.className = 'mapboxgl-ctrl-icon ' + options.className;
      button.type = 'button';
      button.title = options.title;
      button.onclick = options.eventHandler;

      me._container.appendChild(button);

      return button;
    });

    return me._container;
  }

  onRemove() {
    var me = this;

    me._container.parentNode.removeChild(me._container);
    me._map = undefined;
  }
}
