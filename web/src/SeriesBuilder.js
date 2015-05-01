function SeriesBuilder(datasource) {
  this.datasource = datasource;
}

SeriesBuilder.requireLoaded = function (seriesMixed) {
  if ('function' == typeof seriesMixed.load) {
    return seriesMixed.load();
  }

  return new Promise(function (resolve) {
    var seriesList = SeriesBuilder.requireSeriesList(seriesMixed);

    var loaded = [];
    var loadedSeriesCount = 0;
    var expectedSeriesCount = seriesList.length;

    seriesList.forEach(function (seriesList, seriesListIdx) {
      SeriesBuilder.requireLoaded(seriesList).then(function (loadedSeries) {
        loaded[seriesListIdx] = loadedSeries;
        loadedSeriesCount += 1;
        
        if (loadedSeriesCount == expectedSeriesCount) {
          return resolve(loaded);
        }
      })
    });
  });
}

SeriesBuilder.requireSeriesList = function (seriesList) {
  if (Array.isArray(seriesList)) {
    return seriesList;
  } else if ('object' == typeof seriesList) {
    return [ seriesList ];
  }
  
  throw new Error('Unexpected series type: ' + typeof seriesList);
}

SeriesBuilder.consistentReturn = function (input, output) {
  if (Array.isArray(input)) {
    return output;
  }

  return output[0];
}

SeriesBuilder.singleOrListTransform = function (callback) {
  return function (loadedSeries) {
    return SeriesBuilder.consistentReturn(
      loadedSeries,
      SeriesBuilder.requireSeriesList(loadedSeries).map(function (loadedSeries) {
        return callback(loadedSeries);
      })
    );
  };
};

SeriesBuilder.singleOrListDatapointTransform = function (callback) {
  return function (loadedSeries) {
    return SeriesBuilder.consistentReturn(
      loadedSeries,
      SeriesBuilder.requireSeriesList(loadedSeries).map(function (loadedSeries) {
        loadedSeries.data = loadedSeries.data.map(callback);
      
        return loadedSeries;
      })
    );
  };
};

SeriesBuilder.prototype.absolute = function (seriesList) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
      datapoint.y = Math.abs(datapoint.y);
      
      return datapoint;
    })
  );
};

SeriesBuilder.prototype.aggregateLine = function (seriesList, func) {
  var func = func || 'avg';
  
  return new SeriesSynchronousTransform(
    seriesList,
    function (loadedSeries) {
      if (1 == loadedSeries.length) {
        return loadedSeries;
      }

      var byx = {};
  
      SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
        byx[datapoint.x] = byx[datapoint.x] || [];
        byx[datapoint.x].push(datapoint.y);
      })(loadedSeries);

      var res = [];
  
      Object.keys(byx).sort().forEach(function (x) {
        res.push({
          x : x,
          y : SeriesBuilder.aggregators[func](byx[x])
        });
      });
  
      return {
        name : func,
        options : {},
        data : res
      };
    }
  );
};

SeriesBuilder.prototype.alias = function (seriesList, newName) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.name = newName;
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.aliasSub = function (seriesList, search, replace) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.name = loadedSeries.options.name.replace(SeriesRef.wildcardToRegExp(search), replace);
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.alpha = function (seriesList, alpha) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.alpha = alpha;
      
      return loadedSeries;
    })
  );
};

SeriesBuilder.prototype.color = function (seriesList, theColor) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.color = theColor;
      
      return loadedSeries;
    })
  );
};

SeriesBuilder.prototype.dashed = function (seriesList, dashStyle) {
  var dashStyle = dashStyle || 'Dash';

  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.dashStyle = dashStyle;
      
      return loadedSeries;
    })
  );
};

SeriesBuilder.prototype.debug = function (seriesList) {
  return new SeriesSynchronousTransform(
    seriesList,
    function (loadedSeries) {
      return SeriesBuilder.singleOrListTransform(function (loadedSeries) {
        console.log(loadedSeries);

        return loadedSeries;
      })(loadedSeries);
    }
  );
};

SeriesBuilder.prototype.derivative = function (seriesList) {
  return new SeriesSynchronousTransform(
    seriesList,
    function (loadedSeries) {
      return SeriesBuilder.singleOrListTransform(function (loadedSeries) {
        var offset = loadedSeries.data[0].y;
      
        loadedSeries.data = loadedSeries.data.map(function (datapoint) {
          var oldy = datapoint.y;
        
          datapoint.y -= offset;
          
          offset = oldy;
          
          return datapoint;
        });
      
        return loadedSeries;
      })(loadedSeries);
    }
  );
};

SeriesBuilder.prototype.disable = function (seriesList) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.visible = false;
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.group = function () {
  var seriesList = Array.prototype.slice.call(arguments);

  return new SeriesSynchronousTransform(
    seriesList,
    function (loadedSeries) {
      var grouped = [];

      SeriesBuilder.requireSeriesList(loadedSeries).map(function (loadedSeries) {
        grouped = grouped.concat(loadedSeries);
      });

      return grouped;
    }
  );
}

SeriesBuilder.prototype.integral = function (seriesList) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      var offset = 0;
      
      loadedSeries.data = loadedSeries.data.map(function (datapoint) {
        offset = datapoint.y += offset;
        
        return datapoint;
      });
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.invert = function (seriesList, scale) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
      datapoint.y = (datapoint.y == 0) ? 0 : (1 / datapoint.y);
      
      return datapoint;
    })
  );
};

SeriesBuilder.prototype.lineWidth = function (seriesList, width) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.lineWidth = width;
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.nonNegativeDerivative = function (seriesList, maxValue) {
  var maxValue = maxValue || null;

  return new SeriesSynchronousTransform(
    seriesList,
    function (loadedSeries) {
      return SeriesBuilder.singleOrListTransform(function (loadedSeries) {
        var offset = loadedSeries.data[0].y;
      
        loadedSeries.data = loadedSeries.data.map(function (datapoint) {
          var oldy = datapoint.y;
        
          datapoint.y = datapoint.y -= offset;
          
          if (0 > datapoint.y) {
            if (null !== maxValue) {
              datapoint.y = newy + (maxValue - offset);
            } else {
              datapoint.y = 0;
            }
          }
        
          offset = oldy;
          
          return datapoint;
        });
      
        return loadedSeries;
      })(loadedSeries);
    }
  );
};

SeriesBuilder.prototype.offset = function (seriesList, factor) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
      datapoint.y += factor;
      
      return datapoint;
    })
  );
};

SeriesBuilder.prototype.pow = function (seriesList, factor) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
      datapoint.y = Math.pow(datapoint.y, factor);
      
      return datapoint;
    })
  );
};

SeriesBuilder.prototype.scale = function (seriesList, scale) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
      datapoint.y *= scale;
      
      return datapoint;
    })
  );
};

SeriesBuilder.prototype.secondYAxis = function (seriesList) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.yAxis = 1;
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.series = function (name) {
  return new SeriesRef(this.datasource, name);
};

SeriesBuilder.prototype.squareRoot = function (seriesList) {
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
      datapoint.y = Math.sqrt(datapoint.y);
      
      return datapoint;
    })
  );
};

SeriesBuilder.prototype.stacked = function (seriesList, stackName) {
  var stackName = stackName || '_DEFAULT_';

  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      loadedSeries.options.stack = stackName;
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.summarize = function (seriesList, intervalString, func, alignToFrom) {
  var func = func || 'sum';
  var alignToFrom = alignToFrom || false;
  
  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListTransform(function (loadedSeries) {
      if (alignToFrom) {
        var bucketed = SeriesBucket.fillRight(
          SeriesBucket.createRight(loadedSeries.data[0].x, loadedSeries.data[loadedSeries.data.length - 1].x, intervalString),
          loadedSeries.data,
          intervalString
        );
      } else {
        var bucketed = SeriesBucket.fill(
          SeriesBucket.create(loadedSeries.data[0].x, loadedSeries.data[loadedSeries.data.length - 1].x, intervalString),
          loadedSeries.data,
          intervalString
        );
      }

      var res = [];
  
      Object.keys(bucketed).forEach(function (x) {
        res.push({
          x : x,
          y : SeriesBuilder.aggregators[func](bucketed[x])
        });
      });
  
      loadedSeries.data = res;
      
      return loadedSeries;
    })
  );
}

SeriesBuilder.prototype.sumSeries = function (seriesList) {
  return this.aggregateLine(seriesList, 'sum');
}

SeriesBuilder.prototype.sum = SeriesBuilder.prototype.sumSeries;

SeriesBuilder.prototype.threshold = function (value, label, color) {
  var label = label || null;
  var color = color || '#666666';

  return new SeriesRef({
    loadSeries : function (resolve) {
      return new Promise(function (iresolve) {
        return iresolve({
          id : 'threshold1',
          options : {
            mode : 'threshold',
            color : color,
            name : label
          },
          data : [
            {
              x : 0,
              y : value
            }
          ]
        });
      });
    }
  });
}

SeriesBuilder.prototype.timeShift = function (seriesList, timeShift) {
  if ('string' == typeof timeShift) {
    var timeShiftParse = timeShift.match(/^(\+|-)?(\d+)(\w+)$/);
    var timeShift = moment.duration(
      ('+' == timeShiftParse[1] ? 1 : -1) * parseInt(timeShiftParse[2], 10),
      timeShiftParse[3]
    ).asSeconds() * 1000;
  }

  return new SeriesSynchronousTransform(
    seriesList,
    SeriesBuilder.singleOrListDatapointTransform(function (datapoint) {
      datapoint.x = datapoint.x * 1 + timeShift;
      
      return datapoint;
    })
  );
};

SeriesBuilder.aggregators = {};

SeriesBuilder.aggregators.avg = function (ys) {
  if (0 == ys.length) {
    return null;
  }

  var total = 0;
  
  for (var i = 0; i < ys.length; i += 1) {
    total += ys[i];
  }

  return total / ys.length;
};

SeriesBuilder.aggregators.last = function (ys) {
  return 0 < ys.length ? ys[ys.length - 1] : 0;
};

SeriesBuilder.aggregators.max = function (ys) {
  return Math.max.apply(null, ys);
};

SeriesBuilder.aggregators.min = function (ys) {
  return Math.min.apply(null, ys);
};

SeriesBuilder.aggregators.sum = function (ys) {
  var total = 0;

  for (var i = 0; i < ys.length; i += 1) {
    total += ys[i];
  }

  return total;
};
