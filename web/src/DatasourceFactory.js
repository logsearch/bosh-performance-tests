function DatasourceFactory(sources) {
  this.sources = sources || {};
}

DatasourceFactory.prototype.hasSeries = function (series) {
  var that = this;
  
  return new Promise(function (resolve, reject) {
    var found = false;
    var resolved = false;
    var resultsReceived = 0;
    var resultsExpected = 0;
    
    function resultsCallback (result) {
      resultsReceived += 1;

      if (result) {
        found = true;
        
        if (!resolved) {
          resolved = true;

          return resolve(true);
        }
      }
      
      if (resultsExpected == resultsReceived) {
        return resolve(false);
      }
    }

    if (series instanceof RegExp) {
      var seriesString = series.toString();

      if ('/^' == seriesString.substring(0, 2)) {
        // check as much of the regex as we can to avoid loading more than we have to
        seriesString = seriesString
          .replace(/([\.\-])/g, '[#$1#]')
          .replace(/\\\[#(.)#\]/g, '$1')
          .replace(/^\/\^([^\\\[\(]+)(.+)$/, '$1')
          ;

        Object.each(that.sources, function (v, k) {
          var seglen = Math.min(k.length, seriesString.length);

          if (k.substring(0, seglen) == seriesString.substring(0, seglen)) {
            resultsExpected += 1;
            
            v.hasSeries(series).then(resultsCallback);
          }
        });
        
        return;
      }
    }
    
    Object.each(that.sources, function (v, k) {
      if (('string' == typeof series) && (k != series.substring(0, k.length))) {
        return;
      }

      resultsExpected += 1;
      
      v.hasSeries(series).then(resultsCallback);
    });
  });
};

DatasourceFactory.prototype.loadSeries = function (series) {
  var that = this;
  
  return new Promise(function (resolve, reject) {
    var results = [];
    var resultsReceived = 0;
    var resultsExpected = 0;
    
    function resultsCallback (result) {
      resultsReceived += 1;
      
      if (result) {
        if (null == result) {
          // nothing to do
        } else if (Array.isArray(result)) {
          results = results.concat(result);
        } else if ('object' == typeof result) {
          results.push(result);
        } else {
          throw new Error('Unexpected result type: ' + typeof result);
        }
      }

      if (resultsExpected == resultsReceived) {
        resolve(results);
      }
    }

    if (series instanceof RegExp) {
      var seriesString = series.toString();

      if ('/^' == seriesString.substring(0, 2)) {
        // check as much of the regex as we can to avoid loading more than we have to
        seriesString = seriesString
          .replace(/([\.\-])/g, '[#$1#]')
          .replace(/\\\[#(.)#\]/g, '$1')
          .replace(/^\/\^([^\\\[\(]+)(.+)$/, '$1')
          ;

        Object.each(that.sources, function (v, k) {
          var seglen = Math.min(k.length, seriesString.length);

          if (k.substring(0, seglen) == seriesString.substring(0, seglen)) {
            resultsExpected += 1;
            
            v.loadSeries(series).then(resultsCallback);
          }
        });
        
        return;
      }
    }
    
    Object.each(that.sources, function (v, k) {
      if (('string' == typeof series) && (k != series.substring(0, k.length))) {
        return;
      }

      resultsExpected += 1;
      
      v.loadSeries(series).then(resultsCallback);
    });
  })
};

DatasourceFactory.prototype.listSeries = function () {
  var that = this;
  
  return new Promise(function (resolve, reject) {
    var results = [];
    var resultsReceived = 0;
    var resultsExpected = 0;
    
    Object.values(that.sources).forEach(function (source) {
      resultsExpected += 1;
      
      source.listSeries().then(function (result) {
        resultsReceived += 1;

        results = results.concat(result);
      
        if (resultsExpected == resultsReceived) {
          return resolve(results);
        }
      });
    });
  })
}
