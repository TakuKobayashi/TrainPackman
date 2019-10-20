import React from 'react';
import logo from './logo.svg';
import './App.css';
import './style.css';

import { Util } from './compoments/Util';
import JapaneseHolidays from 'japanese-holidays';
import * as turf from '@turf/turf';
import { FeatureCollection, Geometry, Properties } from '@turf/helpers';
import mapboxgl, { Layer } from 'mapbox-gl';
import { MapboxGLButtonControl } from './compoments/MapboxGLButtonControl';
import { TrainLayers } from './compoments/TrainLayers';

const MapboxLayer = require('@deck.gl/mapbox');
const GeoJsonLayer = require('@deck.gl/layers');
const Loader = require('react-loader-spinner');

interface MstData {
  stationLookup: {[s: string]: any};
  railwayLookup: {[s: string]: any};
  trainLookup: {[s: string]: any};
  timetableLookup: {[s: string]: any};
  railDirectionLookup: {[s: string]: any};
  trainTypeLookup: {[s: string]: any};
  operatorLookup: {[s: string]: any};
  airportLookup: {[s: string]: any};
  flightStatusLookup: {[s: string]: any};
  dict: {[s: string]: any};
  stationRefData: {[s: string]: any}[];
  railwayRefData: {[s: string]: any}[];
  trainData: {[s: string]: any}[];
  flightData: {[s: string]: any};
  railwayFeatureCollection: FeatureCollection<Geometry, Properties>,
  timetableRefData: {[s: string]: any}[];
  railDirectionRefData: {[s: string]: any}[];
  trainTypeRefData: {[s: string]: any}[];
  operatorRefData: {[s: string]: any}[];
  airportRefData: {[s: string]: any}[];
  flightStatusRefData: {[s: string]: any}[];
  e: any[];
  featureLookup: {[s: string]: any};
  isLoaded: boolean;
}

class App extends React.Component<{}, MstData> {
  constructor(props: any) {
    super(props);
    mapboxgl.accessToken = 'pk.eyJ1IjoibmFnaXgiLCJhIjoiY2sxaTZxY2gxMDM2MDNjbW5nZ2h4aHB6ZyJ9.npSnxvMC4r5S74l8A9Hrzw';
    this.setState({
      stationLookup: {},
      railwayLookup: {},
      trainLookup: {},
      timetableLookup: {},
      railDirectionLookup: {},
      trainTypeLookup: {},
      operatorLookup: {},
      airportLookup: {},
      flightStatusLookup: {},
      dict: {},
      stationRefData: [],
      railwayRefData: [],
      trainData: [],
      flightData: {},
      timetableRefData: [],
      railDirectionRefData: [],
      trainTypeRefData: [],
      operatorRefData: [],
      airportRefData: [],
      flightStatusRefData: [],
      e: [],
      featureLookup: {},
      isLoaded: false,
    });

    this.loadData();
  }

  private loadData() {
    const util = new Util();

    const self = this;
    var calendar = JapaneseHolidays.isHoliday(today) || today.getDay() == 6 || today.getDay() == 0 ? 'holiday' : 'weekday';
    Promise.all([
      util.loadJSON('data/dictionary-' + lang + '.json'),
      util.loadJSON('data/stations.json'),
      util.loadJSON('data/railways.json'),
      util.loadJSON('data/trains.json'),
      util.loadJSON('data/flights.json'),
      util.loadJSON('data/features.json'),
      util.loadJSON('data/timetable-' + calendar + '.json'),
      util.loadJSON('data/rail-directions.json'),
      util.loadJSON('data/train-types.json'),
      util.loadJSON('data/operators.json'),
      util.loadJSON('data/airports.json'),
      util.loadJSON('data/flight-status.json'),
      util.loadJSON('https://mini-tokyo.appspot.com/e'),
    ]).then(function([
      dict,
      stationRefData,
      railwayRefData,
      trainData,
      flightData,
      railwayFeatureCollection,
      timetableRefData,
      railDirectionRefData,
      trainTypeRefData,
      operatorRefData,
      airportRefData,
      flightStatusRefData,
      e,
    ]) {
      const stationLookup = util.buildLookup(stationRefData);
      const railwayLookup = util.buildLookup(railwayRefData);
      const trainLookup = util.buildLookup(timetableRefData, 't');
      const timetableLookup = util.buildLookup(timetableRefData);
      const railDirectionLookup = util.buildLookup(railDirectionRefData);
      const trainTypeLookup = util.buildLookup(trainTypeRefData);
      const operatorLookup = util.buildLookup(operatorRefData);
      const airportLookup = util.buildLookup(airportRefData);
      const flightStatusLookup = util.buildLookup(flightStatusRefData);

      if(timetableRefData instanceof Array){
        timetableRefData.forEach(function(train) {
          var railway = railwayLookup[train.r];
          var direction = train.d === railway.ascending ? 1 : -1;
          var table = train.tt;
          var length = table.length;
          var previousTableIDs = train.pt;
          var nextTableIDs = train.nt;
          var previousTrain, nextTrain, nextTable;

          if (previousTableIDs) {
            previousTrain = timetableLookup[previousTableIDs[0]];
          }
          if (nextTableIDs) {
            nextTrain = timetableLookup[nextTableIDs[0]];
            if (nextTrain) {
              nextTable = nextTrain.tt;
              table[length - 1].dt = nextTable[0].dt;
            }
          }

          train.start = util.getTime(table[0].dt) - STANDING_DURATION;
          train.end = util.getTime(table[length - 1].dt || table[length - 1].at || table[Math.max(length - 2, 0)].dt);
          train.direction = direction;
          train.altitude = railway.altitude;
          train.carComposition = railway.carComposition;
          train.previousTrain = previousTrain;
          train.nextTrain = nextTrain;
        });
      }

      // @ts-ignore
      self.setState({
        stationLookup,
        railwayLookup,
        trainLookup,
        timetableLookup,
        railDirectionLookup,
        trainTypeLookup,
        operatorLookup,
        airportLookup,
        flightStatusLookup,
        dict,
        stationRefData,
        railwayRefData,
        trainData,
        flightData,
        railwayFeatureCollection,
        timetableRefData,
        railDirectionRefData,
        trainTypeRefData,
        operatorRefData,
        airportRefData,
        flightStatusRefData,
        e,
        isLoaded: true,
      });
      self.setupPrams();
    });
  }

  private setupPrams(){
    const self = this;
    const util = new Util();
    var DEGREE_TO_RADIAN = Math.PI / 180;
    var modelScale = 1 / 2 / Math.PI / 6378137 / Math.cos(35.6814 * DEGREE_TO_RADIAN);
    const unit = Math.pow(2, 14 - util.clamp(map.getZoom(), 13, 19));
    const layerZoom = util.clamp(Math.floor(map.getZoom()), 13, 18);
    const altitudeUnit = Math.pow(2, 14 - layerZoom) * modelScale * 100;
    const objectUnit = Math.max(unit * 0.19, 0.02);
    const objectScale = unit * modelScale * 100;
    const carScale = Math.max(0.02 / 0.19, unit) * modelScale * 100;
    const aircraftScale = Math.max(0.06 / 0.285, unit) * modelScale * 100;
    // Build feature lookup dictionary and update feature properties
    // @ts-ignore
    turf.featureEach(self.state.railwayFeatureCollection, function(feature) {
      var id = feature.properties.id;
      if (id) {
        self.state.featureLookup[id] = feature;
        util.updateDistances(feature);
      }
    });
  }

  private initMap(mst: MstData) {
    const util = new Util();
    const self = this;
    const trainLayers = new TrainLayers();

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'data/osm-liberty.json',
      attributionControl: true,
      hash: true,
      center: [139.767, 35.6814],
      zoom: 14,
      pitch: 60,
    });
    map.once('load', function() {
      //document.getElementById('loader').style.display = 'none';
    });

    map.once('styledata', function() {
      map.setLayoutProperty(
        'poi',
        'text-field',
        '{name_' + (lang === 'ja' || lang === 'ko' ? lang : lang === 'zh' ? 'zh-Hans' : 'en') + '}',
      );

      [13, 14, 15, 16, 17, 18].forEach(function(zoom) {
        var minzoom = zoom <= 13 ? 0 : zoom;
        var maxzoom = zoom >= 18 ? 24 : zoom + 1;
        var lineWidthScale = zoom === 13 ? clamp(Math.pow(2, map.getZoom() - 12), 0.125, 1) : 1;

        map.addLayer(
          new MapboxLayer({
            id: 'railways-ug-' + zoom,
            type: GeoJsonLayer,
            data: filterFeatures(self.state.railwayFeatureCollection, function(p: any) {
              return p.zoom === zoom && p.type === 0 && p.altitude < 0;
            }),
            filled: false,
            stroked: true,
            getLineWidth: function(d: any) {
              return d.properties.width;
            },
            getLineColor: function(d: any) {
              return colorToRGBArray(d.properties.color);
            },
            lineWidthUnits: 'pixels',
            lineWidthScale: lineWidthScale,
            lineJointRounded: true,
            opacity: 0.0625,
          }),
          'building-3d',
        );
        map.setLayerZoomRange('railways-ug-' + zoom, minzoom, maxzoom);
        map.addLayer(
          new MapboxLayer({
            id: 'stations-ug-' + zoom,
            type: GeoJsonLayer,
            data: filterFeatures(self.state.railwayFeatureCollection, function(p: any) {
              return p.zoom === zoom && p.type === 1 && p.altitude < 0;
            }),
            filled: true,
            stroked: true,
            getLineWidth: 4,
            getLineColor: [0, 0, 0],
            lineWidthUnits: 'pixels',
            lineWidthScale: lineWidthScale,
            getFillColor: [255, 255, 255, 179],
            opacity: 0.0625,
          }),
          'building-3d',
        );
        map.setLayerZoomRange('stations-ug-' + zoom, minzoom, maxzoom);
      });

      // Workaround for deck.gl #3522

      /*
      map.__deck.props.getCursor = function() {
        return map.getCanvas().style.cursor;
      };
      */

      map.addLayer(trainLayers.ug, 'building-3d');

      [13, 14, 15, 16, 17, 18].forEach(function(zoom) {
        var minzoom = zoom <= 13 ? 0 : zoom;
        var maxzoom = zoom >= 18 ? 24 : zoom + 1;
        var getWidth = ['get', 'width'];
        var lineWidth = zoom === 13 ? ['interpolate', ['exponential', 2], ['zoom'], 9, ['/', getWidth, 8], 12, getWidth] : getWidth;

        const railwaysOgLayer = {
          id: 'railways-og-' + zoom,
          type: 'line',
          source: {
            type: 'geojson',
            data: filterFeatures(self.state.railwayFeatureCollection, function(p) {
              return p.zoom === zoom && p.type === 0 && p.altitude === 0;
            }),
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': lineWidth,
          },
          minzoom: minzoom,
          maxzoom: maxzoom,
        } as Layer;
        map.addLayer(railwaysOgLayer,'building-3d');

        const stationsOgLayer = {
          id: 'stations-og-' + zoom,
          type: 'fill',
          source: {
            type: 'geojson',
            data: filterFeatures(self.state.railwayFeatureCollection, function(p) {
              return p.zoom === zoom && p.type === 1 && p.altitude === 0;
            }),
          },
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.7,
          },
          minzoom: minzoom,
          maxzoom: maxzoom,
        } as Layer;
        map.addLayer(stationsOgLayer, 'building-3d');

        const stationsOutlineOg = {
          id: 'stations-outline-og-' + zoom,
          type: 'line',
          source: {
            type: 'geojson',
            data: filterFeatures(self.state.railwayFeatureCollection, function(p) {
              return p.zoom === zoom && p.type === 1 && p.altitude === 0;
            }),
          },
          paint: {
            'line-color': ['get', 'outlineColor'],
            'line-width': lineWidth,
          },
          minzoom: minzoom,
          maxzoom: maxzoom,
        } as Layer;
        map.addLayer(stationsOutlineOg,'building-3d');
      });

      map.addLayer(trainLayers.og, 'building-3d');

      map
        .getStyle()
        .layers.filter(function(layer) {
        return layer.type === 'line' || layer.type.lastIndexOf('fill', 0) !== -1;
      })
        .forEach(function(layer) {
          opacityStore[layer.id] = map.getPaintProperty(layer.id, layer.type + '-opacity') || 1;
        });

      var control = new mapboxgl.NavigationControl();
      control._zoomInButton.title = self.state.dict['zoom-in'];
      control._zoomOutButton.title = self.state.dict['zoom-out'];
      control._compass.title = self.state.dict['compass'];
      map.addControl(control);

      control = new mapboxgl.FullscreenControl();
      control._updateTitle = function() {
        mapboxgl.FullscreenControl.prototype._updateTitle.apply(this, arguments);
        this._fullscreenButton.title = self.state.dict[(this._isFullscreen() ? 'exit' : 'enter') + '-fullscreen'];
      };
      map.addControl(control);

      map.addControl(
        new MapboxGLButtonControl([
          {
            className: 'mapbox-ctrl-underground',
            title: self.state.dict['enter-underground'],
            eventHandler: function(event) {
              isUndergroundVisible = !isUndergroundVisible;
              this.title = self.state.dict[(isUndergroundVisible ? 'exit' : 'enter') + '-underground'];
              if (isUndergroundVisible) {
                this.classList.add('mapbox-ctrl-underground-visible');
                map.setPaintProperty('background', 'background-color', 'rgb(16,16,16)');
              } else {
                this.classList.remove('mapbox-ctrl-underground-visible');
                map.setPaintProperty('background', 'background-color', 'rgb(239,239,239)');
              }
              map.getStyle().layers.forEach(function(layer) {
                var id = layer.id;
                var opacity = opacityStore[id];
                if (opacity !== undefined) {
                  if (isUndergroundVisible) {
                    opacity *= id.indexOf('-og-') !== -1 ? 0.25 : 0.0625;
                  }
                  map.setPaintProperty(id, layer.type + '-opacity', opacity);
                }
              });

              startAnimation({
                callback: function(elapsed) {
                  var t = elapsed / 300;

                  [13, 14, 15, 16, 17, 18].forEach(function(zoom) {
                    var opacity = isUndergroundVisible ? 1 * t + 0.0625 * (1 - t) : 1 * (1 - t) + 0.0625 * t;

                    setLayerProps(map, 'railways-ug-' + zoom, { opacity: opacity });
                    setLayerProps(map, 'stations-ug-' + zoom, { opacity: opacity });
                  });
                  Object.keys(activeTrainLookup).forEach(function(key) {
                    var train = activeTrainLookup[key];
                    var opacity = isUndergroundVisible === train.altitude < 0 ? 0.9 * t + 0.225 * (1 - t) : 0.9 * (1 - t) + 0.225 * t;

                    train.cars.forEach(function(car) {
                      car.material.opacity = opacity;
                    });
                    if (train.delayMarker) {
                      train.delayMarker.material.opacity = opacity;
                    }
                  });
                  Object.keys(activeFlightLookup).forEach(function(key) {
                    var flight = activeFlightLookup[key];
                    var opacity = !isUndergroundVisible ? 0.9 * t + 0.225 * (1 - t) : 0.9 * (1 - t) + 0.225 * t;

                    flight.body.material.opacity = flight.wing.material.opacity = flight.vTail.material.opacity = opacity;
                  });
                },
                duration: 300,
              });
            },
          },
          {
            className: 'mapbox-ctrl-track mapbox-ctrl-track-helicopter',
            title: self.state.dict['track'],
            eventHandler: function(event) {
              if (trackingMode === 'helicopter') {
                trackingMode = 'train';
                this.classList.remove('mapbox-ctrl-track-helicopter');
                this.classList.add('mapbox-ctrl-track-train');
              } else {
                trackingMode = 'helicopter';
                this.classList.remove('mapbox-ctrl-track-train');
                this.classList.add('mapbox-ctrl-track-helicopter');
              }
              if (trackedObject) {
                startViewAnimation();
              }
              event.stopPropagation();
            },
          },
          {
            className: 'mapbox-ctrl-realtime mapbox-ctrl-realtime-active',
            title: self.state.dict['exit-realtime'],
            eventHandler: function() {
              isRealtime = !isRealtime;
              this.title = self.state.dict[(isRealtime ? 'exit' : 'enter') + '-realtime'];
              stopAllTrains();
              trackedObject = undefined;
              stopViewAnimation();
              document.getElementsByClassName('mapbox-ctrl-track')[0].classList.remove('mapbox-ctrl-track-active');
              if (isRealtime) {
                this.classList.add('mapbox-ctrl-realtime-active');
              } else {
                this.classList.remove('mapbox-ctrl-realtime-active');
                initModelTrains();
              }
            },
          },
        ]),
        'top-right',
      );

      map.addControl(
        new MapboxGLButtonControl([
          {
            className: 'mapbox-ctrl-github',
            title: self.state.dict['github'],
            eventHandler: function() {
              window.open('https://github.com/nagix/mini-tokyo-3d');
            },
          },
        ]),
        'top-right',
      );

      var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: {
          top: [0, 10],
          bottom: [0, -30],
        },
      });

      map.on('mousemove', function(e) {
        var userData;

        if (isRealtime) {
          markedObject = trainLayers.pickObject(e.point);
          if (markedObject) {
            map.getCanvas().style.cursor = 'pointer';
            userData = markedObject.userData;
            popup
              .setLngLat(adjustCoord(userData.coord, userData.altitude))
              .setHTML(userData.object.description)
              .addTo(map);
          } else if (popup.isOpen()) {
            map.getCanvas().style.cursor = '';
            popup.remove();
          }
        }
      });

      map.on('click', function(e) {
        stopViewAnimation();
        trackedObject = trainLayers.pickObject(e.point);
        if (trackedObject) {
          startViewAnimation();
          document.getElementsByClassName('mapbox-ctrl-track')[0].classList.add('mapbox-ctrl-track-active');
        } else {
          document.getElementsByClassName('mapbox-ctrl-track')[0].classList.remove('mapbox-ctrl-track-active');
        }

        /* For development
        console.log(e.lngLat);
        */
      });

      map.on('zoom', function() {
        if (trackedObject) {
          const altitude = trackedObject.userData.altitude;
          // Keep camera off from the tracked aircraft
          if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < 0.5) {
            map.setZoom(22 - Math.log2(altitude * 0.5));
          }
        }

        var zoom = map.getZoom();
        var unit = Math.pow(2, 14 - clamp(zoom, 13, 19));
        var lineWidthScale = clamp(Math.pow(2, zoom - 12), 0.125, 1);

        setLayerProps(map, 'railways-ug-13', { lineWidthScale: lineWidthScale });
        setLayerProps(map, 'stations-ug-13', { lineWidthScale: lineWidthScale });

        layerZoom = clamp(Math.floor(zoom), 13, 18);
        altitudeUnit = Math.pow(2, 14 - layerZoom) * modelScale * 100;
        objectUnit = Math.max(unit * 0.19, 0.02);
        objectScale = unit * modelScale * 100;
        carScale = Math.max(0.02 / 0.19, unit) * modelScale * 100;
        aircraftScale = Math.max(0.06 / 0.285, unit) * modelScale * 100;

        Object.keys(activeTrainLookup).forEach(function(key) {
          var train = activeTrainLookup[key];

          updateTrainProps(train);
          updateTrainShape(train);
        });
        Object.keys(activeFlightLookup).forEach(function(key) {
          updateFlightShape(activeFlightLookup[key]);
        });
      });

      map.on('resize', function(e) {
        trainLayers.onResize(e);
      });

      repeat();

      if (!isRealtime) {
        initModelTrains();
      }

      a = e[0];

      startAnimation({
        callback: function() {
          var now = Date.now();
          var userData, altitude, bearing;

          if (isRealtime) {
            // Remove all trains if the page has been invisible for more than ten seconds
            if (now - lastFrameRefresh >= 10000) {
              stopAllTrains();
            }
            lastFrameRefresh = now;

            if (Math.floor((now - MIN_DELAY) / TRAIN_REFRESH_INTERVAL) !== Math.floor(lastTrainRefresh / TRAIN_REFRESH_INTERVAL)) {
              refreshTrains();
              refreshFlights();
              loadRealtimeTrainData();
              loadRealtimeFlightData();
              lastTrainRefresh = now - MIN_DELAY;
            }
            if (markedObject) {
              userData = markedObject.userData;
              popup.setLngLat(adjustCoord(userData.coord, userData.altitude)).setHTML(userData.object.description);
            }
          }
          if (trackedObject) {
            altitude = trackedObject.userData.altitude;
            // Keep camera off from the tracked aircraft
            if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < 0.5) {
              map.setZoom(22 - Math.log2(altitude * 0.5));
            }
          }
          if (trackedObject && !viewAnimationID) {
            userData = trackedObject.userData;
            bearing = map.getBearing();
            map.easeTo({
              center: adjustCoord(userData.coord, userData.altitude),
              bearing:
                trackingMode === 'helicopter'
                  ? (trackingBaseBearing + performance.now() / 100) % 360
                  : bearing + (((userData.bearing - bearing + 540) % 360) - 180) * 0.02,
              duration: 0,
            });
          }
        },
      });

      function updateTrainProps(train) {
        var feature = (train.railwayFeature = featureLookup[train.r + '.' + layerZoom]);
        var stationOffsets = feature.properties['station-offsets'];
        var sectionIndex = train.sectionIndex;
        var offset = (train.offset = stationOffsets[sectionIndex]);

        train.interval = stationOffsets[sectionIndex + train.sectionLength] - offset;
      }

      function updateTrainShape(train, t) {
        var feature = train.railwayFeature;
        var offset = train.offset;
        var cars = train.cars;
        var length = cars.length;
        var carComposition = clamp(Math.floor((train.carComposition * 0.02) / objectUnit), 1, train.carComposition);
        var compositionChanged = length !== carComposition;
        var delayMarker = train.delayMarker;
        var i, ilen, railway, car, position, scale, userData, p, coord, bearing, mCoord;

        if (t !== undefined) {
          train._t = t;
        }
        if (train._t === undefined) {
          return;
        }

        for (i = length - 1; i >= carComposition; i--) {
          trainLayers.removeObject(cars.pop(), train);
        }
        for (i = length; i < carComposition; i++) {
          railway = railway || railwayLookup[train.r];
          car = createCube(0.88, 1.76, 0.88, railway.color);
          userData = car.userData;
          userData.object = train;
          userData.altitude = (train.altitude || 0) * Math.pow(2, 14 - layerZoom) * 100;
          cars.push(car);
          trainLayers.addObject(car, train, 1000);
        }
        if (compositionChanged) {
          if (markedObject && markedObject.userData.object === train) {
            markedObject = cars[Math.floor(carComposition / 2)];
          }
          if (trackedObject && trackedObject.userData.object === train) {
            trackedObject = cars[Math.floor(carComposition / 2)];
          }
        }

        for (i = 0, ilen = cars.length; i < ilen; i++) {
          car = cars[i];
          position = car.position;
          scale = car.scale;
          userData = car.userData;

          p = getCoordAndBearing(feature, offset + train._t * train.interval + (i - (carComposition - 1) / 2) * objectUnit);

          coord = userData.coord = p.coord;
          userData.altitude = p.altitude;
          bearing = userData.bearing = p.bearing + (train.direction < 0 ? 180 : 0);
          mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord);

          position.x = mCoord.x - modelOrigin.x;
          position.y = -(mCoord.y - modelOrigin.y);
          position.z = (train.altitude || 0) * altitudeUnit + objectScale / 2;
          scale.x = scale.z = objectScale;
          scale.y = carScale;
          car.rotation.z = -bearing * DEGREE_TO_RADIAN;
        }

        if (train.delay) {
          if (!delayMarker) {
            delayMarker = train.delayMarker = createDelayMarker();
            trainLayers.addObject(delayMarker, train, 1000);
          }

          car = cars[Math.floor(carComposition / 2)];
          merge(delayMarker.position, car.position);
          scale = delayMarker.scale;
          scale.x = scale.y = scale.z = carScale;
        } else if (delayMarker) {
          trainLayers.removeObject(delayMarker, train);
          delete train.delayMarker;
        }
      }

      function updateFlightShape(flight, t) {
        var body = flight.body;
        var wing = flight.wing;
        var vTail = flight.vTail;
        var operator, p, coord, bearing, mCoord;

        if (t !== undefined) {
          flight._t = t;
        }
        if (flight._t === undefined) {
          return;
        }
        if (!body) {
          operator = operatorLookup[flight.a];
          body = flight.body = createCube(0.88, 2.64, 0.88, operator.color || '#FFFFFF');
          wing = flight.wing = createCube(2.64, 0.88, 0.1, operator.color || '#FFFFFF');
          vTail = flight.vTail = createCube(0.1, 0.88, 0.88, operator.tailcolor || '#FFFFFF');
          vTail.geometry.translate(0, -0.88, 0.88);
          body.userData.object = wing.userData.object = vTail.userData.object = flight;
          trainLayers.addObject(body, flight, 1000);
          trainLayers.addObject(wing, flight, 1000);
          trainLayers.addObject(vTail, flight, 1000);
        }

        p = getCoordAndBearing(flight.feature, flight._t * flight.feature.properties.length);

        coord = body.userData.coord = wing.userData.coord = vTail.userData.coord = p.coord;
        body.userData.altitude = wing.userData.altitude = vTail.userData.altitude = p.altitude;
        bearing = body.userData.bearing = wing.userData.bearing = vTail.userData.bearing = p.bearing;
        mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord);

        position = body.position;
        position.x = mCoord.x - modelOrigin.x;
        position.y = -(mCoord.y - modelOrigin.y);
        position.z = p.altitude * modelScale + objectScale / 2;
        scale = body.scale;
        scale.x = scale.z = objectScale;
        scale.y = aircraftScale;
        body.rotation.z = -bearing * DEGREE_TO_RADIAN;

        merge(wing.position, body.position);
        scale = wing.scale;
        scale.x = aircraftScale;
        scale.y = scale.z = objectScale;
        wing.rotation.z = body.rotation.z;

        merge(vTail.position, body.position);
        scale = vTail.scale;
        scale.x = scale.z = objectScale;
        scale.y = aircraftScale;
        vTail.rotation.z = body.rotation.z;
      }

      function initModelTrains() {
        trainData.forEach(function(train, i) {
          var railway = railwayLookup[train.r];

          train.t = i;
          activeTrainLookup[train.t] = train;

          train.sectionLength = train.direction;
          train.carComposition = railway.carComposition;
          train.cars = [];
          updateTrainProps(train);

          function repeat() {
            train.animationID = startTrainAnimation(
              function(t) {
                updateTrainShape(train, t);
              },
              function() {
                var direction = train.direction;
                var sectionIndex = (train.sectionIndex = train.sectionIndex + direction);

                if (sectionIndex <= 0 || sectionIndex >= railway.stations.length - 1) {
                  train.direction = train.sectionLength = -direction;
                }
                updateTrainProps(train);
                updateTrainShape(train, 0);

                // Stop and go
                train.animationID = startAnimation({ complete: repeat, duration: 1000 });
              },
              Math.abs(train.interval),
              TIME_FACTOR,
            );
          }
          repeat();
        });
      }

      function refreshTrains() {
        var now = Date.now();

        timetableRefData.forEach(function(train) {
          var d = train.delay || 0;
          if (
            train.start + d <= now &&
            now <= train.end + d &&
            !activeTrainLookup[train.t] &&
            (!train.previousTrain || !activeTrainLookup[train.previousTrain.t]) &&
            (!train.nextTrain || !activeTrainLookup[train.nextTrain.t]) &&
            (!railwayLookup[train.r].status || realtimeTrainLookup[train.t])
          ) {
            function start(index) {
              var now = Date.now();
              var departureTime;

              if (!setSectionData(train, index)) {
                return; // Out of range
              }
              activeTrainLookup[train.t] = train;
              train.cars = [];
              departureTime = getTime(train.departureTime) + (train.delay || 0);
              if (now >= departureTime) {
                updateTrainProps(train);
                repeat(now - departureTime);
              } else {
                stand();
              }
            }

            function stand(final) {
              var departureTime = getTime(train.departureTime) + (train.delay || 0);

              if (!final) {
                updateTrainProps(train);
                updateTrainShape(train, 0);
              }
              setTrainStandingStatus(train, true);
              train.animationID = startAnimation({
                complete: !final
                  ? repeat
                  : function() {
                    stopTrain(train);
                  },
                duration: Math.max(departureTime - Date.now(), MIN_STANDING_DURATION),
              });
            }

            function repeat(elapsed) {
              setTrainStandingStatus(train, false);
              train.animationID = startTrainAnimation(
                function(t) {
                  updateTrainShape(train, t);
                },
                function() {
                  var markedObjectIndex, trackedObjectIndex;

                  if (!setSectionData(train, train.timetableIndex + 1)) {
                    markedObjectIndex = train.cars.indexOf(markedObject);
                    trackedObjectIndex = train.cars.indexOf(trackedObject);
                    if (train.nextTrain) {
                      stopTrain(train);
                      train = train.nextTrain;
                      if (!activeTrainLookup[train.t]) {
                        start(0);
                        if (train.cars) {
                          if (markedObjectIndex !== -1) {
                            markedObject = train.cars[markedObjectIndex];
                          }
                          if (trackedObjectIndex !== -1) {
                            trackedObject = train.cars[trackedObjectIndex];
                          }
                        }
                      }
                      return;
                    }
                    stand(true);
                  } else {
                    stand();
                  }
                },
                Math.abs(train.interval),
                1,
                elapsed,
              );
            }

            start();
          }
        });
      }

      function refreshFlights() {
        var now = Date.now();

        Object.keys(flightLookup).forEach(function(key) {
          var flight = flightLookup[key];

          if (flight.standing <= now && now <= flight.end && !activeFlightLookup[flight.id]) {
            activeFlightLookup[flight.id] = flight;
            if (now >= flight.start) {
              repeat(now - flight.start);
            } else {
              updateFlightShape(flight, 0);
              setFlightStandingStatus(flight, true);
              flight.animationID = startAnimation({
                complete: repeat,
                duration: flight.start - now,
              });
            }

            function repeat(elapsed) {
              setFlightStandingStatus(flight, false);
              flight.animationID = startFlightAnimation(
                function(t) {
                  updateFlightShape(flight, t);
                },
                function() {
                  setFlightStandingStatus(flight, true);
                  flight.animationID = startAnimation({
                    complete: function() {
                      stopFlight(flight);
                    },
                    duration: Math.max(flight.end - Date.now(), 0),
                  });
                },
                flight.feature.properties.length,
                flight.maxSpeed,
                flight.acceleration,
                elapsed,
              );
            }
          }
        });
      }

      function startViewAnimation() {
        var t2 = 0;

        trackingBaseBearing = map.getBearing() - performance.now() / 100;
        viewAnimationID = startAnimation({
          callback: function(elapsed) {
            var t1 = easeOutQuart(elapsed / 1000);
            var factor = (1 - t1) / (1 - t2);
            var userData = trackedObject.userData;
            var coord = adjustCoord(userData.coord, userData.altitude);
            var lng = coord[0];
            var lat = coord[1];
            var center = map.getCenter();
            var bearing = userData.bearing;

            map.easeTo({
              center: [lng - (lng - center.lng) * factor, lat - (lat - center.lat) * factor],
              bearing:
                trackingMode === 'helicopter'
                  ? (trackingBaseBearing + performance.now() / 100) % 360
                  : bearing - (((bearing - map.getBearing() + 540) % 360) - 180) * factor,
              duration: 0,
            });
            t2 = t1;
          },
          complete: function() {
            viewAnimationID = undefined;
          },
          duration: 1000,
        });
      }

      function stopViewAnimation() {
        if (viewAnimationID) {
          stopAnimation(viewAnimationID);
          viewAnimationID = undefined;
        }
      }

      function adjustCoord(coord, altitude) {
        var mCoord, pos, world;

        if (!altitude) {
          return coord;
        }
        mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord);
        pos = new THREE.Vector3(mCoord.x - modelOrigin.x, -(mCoord.y - modelOrigin.y), altitude * modelScale).project(
          trainLayers.ug.camera,
        );
        world = map.unproject([((pos.x + 1) / 2) * map.transform.width, ((1 - pos.y) / 2) * map.transform.height]);
        return [world.lng, world.lat];
      }

      function getLocalizedRailwayTitle(railway) {
        const title = (railwayLookup[railway] || {}).title || {};
        return title[lang] || title['en'];
      }

      function getLocalizedRailDirectionTitle(direction) {
        const title = (railDirectionLookup[direction] || {}).title || {};
        return title[lang] || title['en'];
      }

      function getLocalizedTrainTypeTitle(type) {
        const title = (trainTypeLookup[type] || {}).title || {};
        return title[lang] || title['en'];
      }

      function getLocalizedStationTitle(station) {
        station = Array.isArray(station) ? station[0] : station;
        const title = (stationLookup[station] || {}).title || {};
        return title[lang] || title['en'];
      }

      function getLocalizedOperatorTitle(operator) {
        const title = (self.state.operatorLookup[operator] || {}).title || {};
        return title[lang] || title['en'];
      }

      function getLocalizedAirportTitle(airport) {
        const title = (self.state.airportLookup[airport] || {}).title || {};
        return title[lang] || title['en'];
      }

      function getLocalizedFlightStatusTitle(status) {
        const title = (self.state.flightStatusLookup[status] || {}).title || {};
        return title[lang] || title['en'];
      }

      function setTrainStandingStatus(train, standing) {
        var railwayID = train.r;
        var railway = self.state.railwayLookup[railwayID];
        var destination = train.ds;
        var delay = train.delay || 0;

        train.standing = standing;
        train.description =
          '<span class="desc-box" style="background-color: ' +
          railway.color +
          ';"></span> ' +
          '<strong>' +
          getLocalizedRailwayTitle(railwayID) +
          '</strong>' +
          '<br>' +
          getLocalizedTrainTypeTitle(train.y) +
          ' ' +
          (destination ? self.state.dict['for'].replace('$1', getLocalizedStationTitle(destination)) : getLocalizedRailDirectionTitle(train.d)) +
          '<br><strong>' +
          self.state.dict['train-number'] +
          ':</strong> ' +
          train.n +
          '<br>' +
          (delay >= 60000 ? '<span class="desc-caution">' : '') +
          '<strong>' +
          self.state.dict[train.standing ? 'standing-at' : 'previous-stop'] +
          ':</strong> ' +
          getLocalizedStationTitle(train.departureStation) +
          ' ' +
          getTimeString(getTime(train.departureTime) + delay) +
          (train.arrivalStation
            ? '<br><strong>' +
            self.state.dict['next-stop'] +
            ':</strong> ' +
            getLocalizedStationTitle(train.arrivalStation) +
            ' ' +
            getTimeString(getTime(train.arrivalTime) + delay)
            : '') +
          (delay >= 60000 ? '<br>' + self.state.dict['delay'].replace('$1', Math.floor(delay / 60000)) + '</span>' : '') +
          (railway.status && lang === 'ja'
            ? '<br><span class="desc-caution"><strong>' + railway.status + ':</strong> ' + railway.text + '</span>'
            : '');
      }

      function setFlightStandingStatus(flight, standing) {
        var airlineID = flight.a;
        var flightNumber = flight.n;
        var destination = flight.ds;
        var origin = flight.or;
        var scheduledTime = flight.sdt || flight.sat;
        var estimatedTime = flight.edt || flight.eat;
        var actualTime = flight.adt || flight.aat;
        var delayed = (estimatedTime || actualTime) && scheduledTime !== (estimatedTime || actualTime);

        flight.description =
          '<span class="desc-box" style="background-color: ' +
          (self.state.operatorLookup[airlineID].tailcolor || '#FFFFFF') +
          ';"></span> ' +
          '<strong>' +
          getLocalizedOperatorTitle(airlineID) +
          '</strong>' +
          '<br>' +
          flightNumber[0] +
          ' ' +
          self.state.dict[destination ? 'to' : 'from'].replace('$1', getLocalizedAirportTitle(destination || origin)) +
          '<br><strong>' +
          self.state.dict['status'] +
          ':</strong> ' +
          getLocalizedFlightStatusTitle(flight.s) +
          '<br><strong>' +
          self.state.dict['scheduled-' + (destination ? 'departure' : 'arrival') + '-time'] +
          ':</strong> ' +
          scheduledTime +
          (delayed ? '<span class="desc-caution">' : '') +
          (estimatedTime || actualTime
            ? '<br><strong>' +
            (estimatedTime
              ? self.state.dict['estimated-' + (destination ? 'departure' : 'arrival') + '-time'] + ':</strong> ' + estimatedTime
              : self.state.dict['actual-' + (destination ? 'departure' : 'arrival') + '-time'] + ':</strong> ' + actualTime)
            : '') +
          (delayed ? '</span>' : '') +
          (flightNumber.length > 1 ? '<br><strong>' + self.state.dict['code-share'] + ':</strong> ' + flightNumber.slice(1).join(' ') : '');
      }

      function stopTrain(train) {
        stopAnimation(train.animationID);
        if (train.cars) {
          train.cars.forEach(function(car) {
            trainLayers.removeObject(car, train, 1000);
          });
        }
        delete train.cars;
        delete self.state.activeTrainLookup[train.t];
        if (train.delayMarker) {
          trainLayers.removeObject(train.delayMarker, train, 1000);
          delete train.delayMarker;
        }
      }

      function stopFlight(flight) {
        stopAnimation(flight.animationID);
        trainLayers.removeObject(flight.body, flight, 1000);
        trainLayers.removeObject(flight.wing, flight, 1000);
        trainLayers.removeObject(flight.vTail, flight, 1000);
        delete flight.body;
        delete flight.wing;
        delete flight.vTail;
        delete self.state.activeFlightLookup[flight.id];
      }

      function stopAllTrains() {
        Object.keys(activeTrainLookup).forEach(function(key) {
          stopTrain(activeTrainLookup[key]);
        });
        Object.keys(activeFlightLookup).forEach(function(key) {
          stopFlight(activeFlightLookup[key]);
        });
        lastTrainRefresh = undefined;
      }

      function loadRealtimeTrainData() {
        Promise.all([
          loadJSON(
            API_URL +
            'odpt:TrainInformation?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TWR,odpt.Operator:TokyoMetro,odpt.Operator:Toei,odpt.Operator:Keio',
          ),
          loadJSON(API_URL + 'odpt:Train?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TokyoMetro,odpt.Operator:Toei'),
        ]).then(function([trainInfoRefData, trainRefData]) {
          // Reset railway information text
          railwayRefData.forEach(function(railway) {
            delete railway.status;
            delete railway.text;
          });

          trainInfoRefData.forEach(function(trainInfoRef) {
            var operatorID = removePrefix(trainInfoRef['odpt:operator']);
            var railwayID = removePrefix(trainInfoRef['odpt:railway']);
            var status = trainInfoRef['odpt:trainInformationStatus'];
            var text = trainInfoRef['odpt:trainInformationText'];
            var railways;

            // Train information text is provided in Japanese only
            if (
              railwayID &&
              status &&
              status.ja &&
              (operatorID === 'JR-East' || operatorID === 'TokyoMetro' || operatorID === 'Toei') &&
              (status.ja.indexOf('見合わせ') !== -1 ||
                status.ja.indexOf('折返し運転') !== -1 ||
                status.ja.indexOf('運休') !== -1 ||
                status.ja.indexOf('遅延') !== -1)
            ) {
              railway = railwayLookup[railwayID];
              railway.status = status.ja;
              railway.text = text.ja;
              Object.keys(activeTrainLookup).forEach(function(key) {
                var train = activeTrainLookup[key];
                if (train.r === railwayID) {
                  stopTrain(train);
                }
              });
            }
          });

          realtimeTrainLookup = {};

          trainRefData.forEach(function(trainRef) {
            var delay = trainRef['odpt:delay'] * 1000;
            var carComposition = trainRef['odpt:carComposition'];
            var trainType = removePrefix(trainRef['odpt:trainType']);
            var destination = removePrefix(trainRef['odpt:destinationStation']);
            var id = removePrefix(trainRef['owl:sameAs']);
            var train = trainLookup[id];
            var activeTrain = activeTrainLookup[id];
            var changed = false;

            if (train) {
              realtimeTrainLookup[id] = train;
              if (delay && train.delay !== delay) {
                train.delay = delay;
                changed = true;
              }
              if (carComposition && train.carComposition !== carComposition) {
                train.carComposition = carComposition;
                changed = true;
              }
              if (trainType && train.y !== trainType) {
                train.y = trainType;
                changed = true;
              }
              if (train.ds && destination && train.ds[0] !== destination[0]) {
                train.ds = destination;
                changed = true;
              }
              if (changed && activeTrainLookup[id]) {
                stopTrain(train);
              }
            }
          });
          refreshTrains();
        });
      }

      function loadRealtimeFlightData() {
        Promise.all([
          loadJSON(API_URL + 'odpt:FlightInformationArrival?odpt:operator=odpt.Operator:NAA,odpt.Operator:HND-JAT,odpt.Operator:HND-TIAT'),
          loadJSON(
            API_URL + 'odpt:FlightInformationDeparture?odpt:operator=odpt.Operator:NAA,odpt.Operator:HND-JAT,odpt.Operator:HND-TIAT',
          ),
        ]).then(function(flightRefData) {
          var flightQueue = {};

          concat(flightRefData).forEach(function(flightRef) {
            var id = removePrefix(flightRef['owl:sameAs']);
            var flight = flightLookup[id];
            var status = removePrefix(flightRef['odpt:flightStatus']);
            var maxSpeed = MAX_FLIGHT_SPEED;
            var acceleration = FLIGHT_ACCELERATION;
            var departureAirport, arrivalAirport, runway, feature, departureTime, arrivalTime, duration;

            if (!flight) {
              if (status === 'Cancelled') {
                return;
              }
              departureAirport = removePrefix(flightRef['odpt:departureAirport']);
              arrivalAirport = removePrefix(flightRef['odpt:arrivalAirport']);
              runway =
                departureAirport === 'NRT'
                  ? departureAirport + '.34L.Dep'
                  : arrivalAirport === 'NRT'
                  ? arrivalAirport + '.34R.Arr'
                  : departureAirport === 'HND'
                    ? departureAirport + '.05.Dep'
                    : arrivalAirport === 'HND'
                      ? arrivalAirport + '.34L.Arr'
                      : undefined;
              feature = featureLookup[runway];
              if (feature) {
                flight = flightLookup[id] = {
                  id: id,
                  n: flightRef['odpt:flightNumber'],
                  a: removePrefix(flightRef['odpt:airline']),
                  dp: departureAirport,
                  ar: arrivalAirport,
                  ds: removePrefix(flightRef['odpt:destinationAirport']),
                  or: removePrefix(flightRef['odpt:originAirport']),
                  runway: runway,
                  feature: feature,
                };
              } else {
                return;
              }
            }
            merge(flight, {
              s: status,
              edt: flightRef['odpt:estimatedDepartureTime'],
              adt: flightRef['odpt:actualDepartureTime'],
              sdt: flightRef['odpt:scheduledDepartureTime'],
              eat: flightRef['odpt:estimatedArrivalTime'],
              aat: flightRef['odpt:actualArrivalTime'],
              sat: flightRef['odpt:scheduledArrivalTime'],
            });

            departureTime = flight.edt || flight.adt || flight.sdt;
            arrivalTime = flight.eat || flight.aat || flight.sat;

            if (arrivalTime) {
              maxSpeed /= 2;
              acceleration /= -2;
            }

            duration = maxSpeed / Math.abs(acceleration) / 2 + flight.feature.properties.length / maxSpeed;

            if (departureTime) {
              flight.start = getTime(departureTime);
              flight.standing = flight.start - STANDING_DURATION;
              flight.end = flight.start + duration;
            } else {
              flight.start = flight.standing = getTime(arrivalTime) - duration;
              flight.end = flight.start + duration + STANDING_DURATION;
            }
            flight.maxSpeed = maxSpeed;
            flight.acceleration = acceleration;

            queue = flightQueue[flight.runway] = flightQueue[flight.runway] || [];
            queue.push(flight);
          });

          Object.keys(flightQueue).forEach(function(key) {
            var queue = flightQueue[key];
            var latest = 0;

            queue.sort(function(a, b) {
              return a.start - b.start;
            });
            queue.forEach(function(flight) {
              var delay = Math.max(flight.start, latest + MIN_FLIGHT_INTERVAL) - flight.start;

              if (delay) {
                flight.start += delay;
                flight.standing += delay;
                flight.end += delay;
              }
              latest = flight.start;
            });
          });

          refreshFlights();
        });
      }
    });
  }

  render():
    | React.ReactElement<any, string | React.JSXElementConstructor<any>>
    | string
    | number
    | {}
    | React.ReactNodeArray
    | React.ReactPortal
    | boolean
    | null
    | undefined {
    return (
      <div className="App">
        <header className="App-header">
          <Loader
            type="TailSpin"
            visible={this.state.isLoaded}
          />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export default App;
