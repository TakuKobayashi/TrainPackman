import { TrainLayer } from './TrainLayer';
import { Util } from './Util';

export class TrainLayers {
  ug: TrainLayer;
  og: TrainLayer;
  private util: Util;

  constructor() {
    this.ug = new TrainLayer('trains-ug');
    this.og = new TrainLayer('trains-og');
    this.util = new Util();
  }

  addObject(object, train, duration) {
    var layer = train.altitude < 0 ? this.ug : this.og;

    object.material.opacity = 0;
    layer.scene.add(object);
    if (duration > 0) {
      this.util.startAnimation({
        callback: function(elapsed) {
          object.material.opacity = (getTrainOpacity(train) * elapsed) / duration;
        },
        duration: duration,
      });
    }
  }

  removeObject(object, train, duration) {
    var layer = train.altitude < 0 ? this.ug : this.og;

    if (!object) {
      return;
    }
    if (duration > 0) {
      this.util.startAnimation({
        callback: function(elapsed) {
          object.material.opacity = getTrainOpacity(train) * (1 - elapsed / duration);
        },
        complete: function() {
          layer.scene.remove(object);
        },
        duration: duration,
      });
    } else {
      layer.scene.remove(object);
    }
  }

  pickObject(point) {
    if (isUndergroundVisible) {
      return this.ug.pickObject(point) || this.og.pickObject(point);
    } else {
      return this.og.pickObject(point) || this.ug.pickObject(point);
    }
  }

  onResize(event) {
    this.ug.onResize(event);
    this.og.onResize(event);
  }
}
