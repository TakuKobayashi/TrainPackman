import * as THREE from 'three';
import * as turf from '@turf/turf';
import * as uuid from "uuid/v4";

export class Util {
  private animations: { [s: string]: any } = {};

  constructor() {}

  colorToRGBArray(color) {
    var c = parseInt(color.replace('#', ''), 16);
    return [Math.floor(c / 65536) % 256, Math.floor(c / 256) % 256, c % 256, 255];
  }

  updateDistances(line) {
    var coords = turf.getCoords(line);
    var travelled = 0;
    var distances = [];
    var i;

    for (i = 0; i < coords.length; i++) {
      if (i > 0) {
        travelled += turf.distance(coords[i - 1], coords[i]);
      }
      distances.push(travelled);
    }
    line.properties.distances = distances;
  }

  /**
   * Returns coordinates, altitude and bearing of the train from its distance
   * @param {object} line - lineString of the railway
   * @param {number} distance - Distance from the beginning of the lineString
   * @returns {object} coord, altitude and bearing
   */
  getCoordAndBearing(line, distance) {
    var coords = turf.getCoords(line);
    var distances = line.properties.distances;
    var start = 0;
    var end = coords.length - 1;
    var center, index, coord, nextCoord, baseDistance, overshot, altitude, bearing;

    if (distance >= distances[end]) {
      coord = coords[end];
      return {
        coord: coord,
        altitude: coord[2] || 0,
        bearing: turf.bearing(coords[end - 1], coord),
      };
    }

    while (start !== end - 1) {
      center = Math.floor((start + end) / 2);
      if (distance < distances[center]) {
        end = center;
      } else {
        start = center;
      }
    }
    index = start;

    coord = coords[index];
    nextCoord = coords[index + 1];
    baseDistance = distances[index];
    overshot = distance - baseDistance;
    altitude = coord[2] || 0;
    bearing = turf.bearing(coord, nextCoord);
    return {
      coord: overshot === 0 ? coord : turf.getCoord(turf.destination(coord, overshot, bearing)),
      altitude: altitude + (((nextCoord[2] || 0) - altitude) * overshot) / (distances[index + 1] - baseDistance),
      bearing: bearing,
    };
  }

  getLocationAlongLine(line, point) {
    var nearestPoint = turf.nearestPointOnLine(line, point);
    return nearestPoint.properties.location;
  }

  filterFeatures(featureCollection, fn) {
    return turf.featureCollection(
      featureCollection.features.filter(function(feature) {
        return fn(feature.properties);
      }),
    );
  }

  setLayerProps(map, id, props) {
    map.getLayer(id).implementation.setProps(props);
  }

  repeat() {
    var ids = Object.keys(this.animations);
    var now = performance.now();
    var i, ilen, id, animation, start, duration, elapsed, callback;

    for (i = 0, ilen = ids.length; i < ilen; i++) {
      id = ids[i];
      animation = this.animations[id];
      if (animation) {
        start = animation.start = animation.start || now;
        duration = animation.duration;
        elapsed = now - start;
        callback = animation.callback;
        if (callback) {
          callback(Math.min(elapsed, duration), duration);
        }
        if (elapsed >= duration) {
          callback = animation.complete;
          if (callback) {
            callback();
          }
          stopAnimation(id);
        }
      }
    }
    requestAnimationFrame(repeat);
  }

  /**
   * Starts a new animation.
   * @param {object} options - Animation options
   * @param {function} options.callback - Function called on every frame
   * @param {function} options.complete - Function called when the animation completes
   * @param {number} options.duration - Animation duration. Default is Infinity
   * @param {number} options.start - Animation start time (same timestamp as performance.now())
   * @returns {number} Animation ID which can be used to stop
   */
  startAnimation(options) {
    if (options.duration === undefined) {
      options.duration = Infinity;
    }
    const animationID = uuid();
    this.animations[animationID] = options;
    return animationID;
  }

  /**
   * Stops an animation
   * @param {number} id - Animation ID to stop
   */
  stopAnimation(id: string) {
    if (this.animations[id]) {
      delete this.animations[id];
    }
  }

  startTrainAnimation(callback, endCallback, distance, timeFactor, start) {
    var maxSpeed = MAX_SPEED * timeFactor;
    var acceleration = ACCELERATION * timeFactor * timeFactor;
    var maxAccelerationTime = MAX_ACCELERATION_TIME / timeFactor;
    var duration =
      distance < MAX_ACC_DISTANCE * 2
        ? Math.sqrt(distance / acceleration) * 2
        : maxAccelerationTime * 2 + (distance - MAX_ACC_DISTANCE * 2) / maxSpeed;
    var accelerationTime = Math.min(maxAccelerationTime, duration / 2);

    return this.startAnimation({
      callback: function(elapsed) {
        var left = duration - elapsed;
        var d;

        if (elapsed <= accelerationTime) {
          d = (acceleration / 2) * elapsed * elapsed;
        } else if (left <= accelerationTime) {
          d = distance - (acceleration / 2) * left * left;
        } else {
          d = MAX_ACC_DISTANCE + maxSpeed * (elapsed - maxAccelerationTime);
        }
        callback(d / distance);
      },
      complete: endCallback,
      duration: duration,
      start: start > 0 ? performance.now() - start : undefined,
    });
  }

  startFlightAnimation(callback, endCallback, distance, maxSpeed, acceleration, start) {
    var accelerationTime = maxSpeed / Math.abs(acceleration);
    var duration = accelerationTime / 2 + distance / maxSpeed;

    return startAnimation({
      callback: function(elapsed) {
        var left = duration - elapsed;
        var d;

        if (acceleration > 0) {
          if (elapsed <= accelerationTime) {
            d = (acceleration / 2) * elapsed * elapsed;
          } else {
            d = maxSpeed * (elapsed - accelerationTime / 2);
          }
        } else {
          if (left <= accelerationTime) {
            d = distance + (acceleration / 2) * left * left;
          } else {
            d = maxSpeed * elapsed;
          }
        }
        callback(d / distance);
      },
      complete: endCallback,
      duration: duration,
      start: start > 0 ? performance.now() - start : undefined,
    });
  }

  easeOutQuart(t) {
    return -((t = t - 1) * t * t * t - 1);
  }

  concat(arr) {
    return Array.prototype.concat.apply([], arr);
  }

  merge(target, source) {
    if (target === undefined || source === undefined) {
      return;
    }
    Object.keys(source).forEach(function(key) {
      target[key] = source[key];
    });
    return target;
  }

  clamp(value, lower, upper) {
    return Math.min(Math.max(value, lower), upper);
  }

  inRange(value, start, end) {
    return value >= start && value < end;
  }

  removePrefix(value) {
    if (typeof value === 'string') {
      return value.replace(/.*:/, '');
    }
    if (Array.isArray(value)) {
      return value.map(removePrefix);
    }
    return value;
  }

  loadJSON(url) {
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest();

      if (url.indexOf(API_URL) === 0) {
        url += a;
      }
      request.open('GET', url);
      request.onreadystatechange = function() {
        if (request.readyState === 4) {
          if (request.status === 200) {
            resolve(JSON.parse(request.response));
          } else {
            reject(Error(request.statusText));
          }
        }
      };
      request.send();
    });
  }

  buildLookup(array, key: string | undefined = undefined): {[s: string]: any} {
    var lookup: {[s: string]: any} = {};

    const correctKey = key || 'id';
    array.forEach(function(element) {
      lookup[element[correctKey]] = element;
    });
    return lookup;
  }

  getTime(timeString) {
    var date = new Date();
    var timeStrings = (timeString || '').split(':');
    var hours = +timeStrings[0];
    var tzDiff = date.getTimezoneOffset() + 540; // Difference between local time to JST

    // Adjust local time to JST (UTC+9)
    date.setMinutes(date.getMinutes() + tzDiff);

    // Special handling of time between midnight and 3am
    hours += (date.getHours() < 3 ? -24 : 0) + (hours < 3 ? 24 : 0);

    // Adjust JST back to local time
    return date.setHours(hours, +timeStrings[1] - tzDiff, Math.floor(MIN_DELAY / 1000), MIN_DELAY % 1000);
  }

  getTimeString(time) {
    var date = new Date(time);
    var tzDiff = date.getTimezoneOffset() + 540; // Difference between local time to JST

    // Adjust local time to JST (UTC+9)
    date.setMinutes(date.getMinutes() + tzDiff);

    return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
  }

  createCube(x, y, z, color) {
    var geometry = new THREE.BoxBufferGeometry(x, y, z);
    var material = new THREE.MeshLambertMaterial({
      color: parseInt(color.replace('#', ''), 16),
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: Math.random(),
    });
    return new THREE.Mesh(geometry, material);
  }

  createDelayMarker() {
    var geometry = new THREE.SphereBufferGeometry(1.8, 32, 32);
    var material = new THREE.ShaderMaterial({
      uniforms: { glowColor: { type: 'c', value: new THREE.Color(0xff9900) } },
      vertexShader: [
        'varying float intensity;',
        'void main() {',
        'vec3 vNormal = normalize( normalMatrix * normal );',
        'vec3 vNormel = normalize( vec3( modelViewMatrix * vec4( position, 1.0 ) ) );',
        'vColor = color;',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 glowColor;',
        'varying float intensity;',
        'void main() {',
        'float r = glowColor.r + ( 1.0 - glowColor.r ) * intensity;',
        'float g = glowColor.g + ( 1.0 - glowColor.g ) * intensity;',
        'float b = glowColor.b + ( 1.0 - glowColor.b ) * intensity;',
        'gl_FragColor = vec4( r, g, b, 1.0 );',
        '}',
      ].join('\n'),
      blending: THREE.MultiplyBlending,
      depthWrite: false,
    });
    return new THREE.Mesh(geometry, material);
  }

  getTrainOpacity(train) {
    return isUndergroundVisible === train.altitude < 0 ? 0.9 : 0.225;
  }

  setSectionData(train, index) {
    var table = train.tt;
    var delay = train.delay || 0;
    var now = Date.now();
    var index =
      index !== undefined
        ? index
        : table.reduce(function(acc, cur, i) {
            return getTime(cur.dt) + delay <= now ? i : acc;
          }, 0);
    var current = table[index];
    var next = table[index + 1];
    var stations = railwayLookup[train.r].stations;
    var departureStation = current.ds || current.as;
    var arrivalStation = next && (next.as || next.ds);
    var currentSection, nextSection;

    if (train.direction > 0) {
      currentSection = stations.indexOf(departureStation);
      nextSection = stations.indexOf(arrivalStation, currentSection);
    } else {
      currentSection = stations.lastIndexOf(departureStation);
      nextSection = stations.lastIndexOf(arrivalStation, currentSection);
    }

    train.timetableIndex = index;
    train.departureStation = departureStation;
    train.departureTime = current.dt || current.at;

    if (currentSection >= 0 && nextSection >= 0) {
      train.sectionIndex = currentSection;
      train.sectionLength = nextSection - currentSection;
      train.arrivalStation = arrivalStation;
      train.arrivalTime = next.at || next.dt;

      return true;
    }

    train.arrivalStation = undefined;
    train.arrivalTime = undefined;
  }

  getLang() {
    var match = window.location.search.match(/lang=(.*?)(&|$)/);
    var lang = match ? decodeURIComponent(match[1]).substring(0, 2) : '';

    if (lang.match(/ja|en|ko|zh|th|ne/)) {
      return lang;
    }

    lang = (window.navigator.languages && window.navigator.languages[0]) ||
      window.navigator.language ||
      '';
    lang = lang.substring(0, 2);

    return lang.match(/ja|en|ko|zh|th|ne/) ? lang : 'en';
  }
}
