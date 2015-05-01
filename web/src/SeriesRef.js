function SeriesRef(datasource, ref) {
  this.datasource = datasource;
  this.ref = ref;
}

SeriesRef.prototype.load = function () {
  var that = this;

  return new Promise(function (resolve, reject) {
    that.datasource.loadSeries(SeriesRef.wildcardToRegExp(that.ref)).then(resolve);
  });
}

SeriesRef.quoteRegExpString = function (str) {
  // http://stackoverflow.com/questions/2593637/how-to-escape-regular-expression-in-javascript
  return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}

SeriesRef.wildcardToRegExp = function (series) {
  if ('string' == typeof series) {
    if (0 <= series.indexOf('*')) {
      return new RegExp('^' + SeriesRef.quoteRegExpString(series).replace('\\*', '([^\.]+)') + '$');
    }
  }
  
  return series;
};
