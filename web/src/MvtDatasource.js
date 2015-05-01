function MvtDatasource(srcpath, context) {
  this.srcpath = srcpath;
  this.context = context || '';
  this.metrics = null;
  this.req = null;
}

MvtDatasource.prototype.hasSeries = function (series) {
  var that = this;
  
  return new Promise(function (resolve, reject) {
    that.requireMetrics().then(function () {
      if (series instanceof RegExp) {
        that.globRegex(series).then(function (multiseries) {
          resolve(0 < multiseries.length);
        })
      }
      
      resolve(series in that.metrics);
    })
  })
}

MvtDatasource.prototype.loadSeries = function (series) {
  var that = this;

  return new Promise(function (resolve, reject) {
    that.requireMetrics().then(function () {
      if (series instanceof RegExp) {
        return that.globRegex(series).then(function (multiseries) {
          var loaded = [];
          
          if (0 == multiseries.length) {
            return resolve(null);
          }

          multiseries.forEach(function (series, seriesIdx) {
            that.loadSeries(series).then(function (loadedSeries) {
              loaded[seriesIdx] = loadedSeries;

              if (loaded.length == multiseries.length) {
                return resolve(loaded);
              }
            })
          });
        });
      }
      
      that.requireMetric(series).then(function (loadedSeriesData) {
        if (null === loadedSeriesData) {
          return resolve(null);
        }

        return resolve({
          name : series,
          options : {
            name : series
          },
          data : loadedSeriesData
        });
      });
    });
  });
};

MvtDatasource.prototype.listSeries = function (series) {
  var that = this;
  
  return new Promise(function (resolve, reject) {
    that.requireMetrics().then(function () {
      return resolve(Object.keys(that.metrics));
    })
  })
};

MvtDatasource.prototype.globRegex = function (regex) {
  var that = this;
  
  return new Promise(function (resolve, reject) {
    that.requireMetrics().then(function () {
      resolve(
        Object.keys(that.metrics).filter(function (metric) {
          return regex.exec(metric);
        })
      );
    })
  });
};

MvtDatasource.prototype.requireMetric = function (metric) {
  var that = this;

  return new Promise(function (resolve, reject) {
    that.requireMetrics().then(function () {
      if (!(metric in that.metrics)) {
        return resolve(null);
      }
      
      if ('string' == typeof that.metrics[metric]) {
        var lasttime = 0;
        var lastvalue = null;

        that.metrics[metric] = that.metrics[metric].split(';').map(function (segment, i) {
          var segsplit = segment.split(':');
          var retval = null;

          if (1 == segsplit.length) {
            retval = {
              x : lasttime + (parseInt(segsplit[0], 10) * 1000),
              y : lastvalue
            };
          } else {
            retval = {
              x : lasttime + (parseInt(segsplit[0], 10) * 1000),
              y : parseFloat(segsplit[1])
            };
          }

          lasttime = retval.x;
          lastvalue = retval.y;

          return retval;
        });
      }

      resolve(Array.clone(that.metrics[metric]));
    });
  })
};

MvtDatasource.prototype.requireMetrics = function () {
  var that = this;
  
  this.req = new Promise(function (resolve, reject) {
    if (that.metrics) {
      return resolve();
    } else if (that.req) {
      return that.req.then(function (data) {
        resolve();
      });
    }
    
    new Request({
      method : 'get',
      url : that.srcpath,
      onSuccess : function (data) {
        var metrics = {};
        var reSplit = /^([^\s]+)\s+(.*)$/;

        data.split("\n").forEach(function (line) {
          if ('' == line) {
            return;
          }

          var sp = reSplit.exec(line);

          if (!sp) {
            console.warn('Failed to parse line from ' + that.srcpath + ': ' + line);

            return;
          }

          metrics[that.context + sp[1]] = sp[2];
        });

        that.metrics = metrics;

        resolve();
      }
    }).send();
  });
  
  return this.req;
};
