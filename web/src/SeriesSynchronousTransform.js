function SeriesSynchronousTransform(series, transformer) {
  this.series = series;
  this.transformer = transformer;
}

SeriesSynchronousTransform.prototype.load = function () {
  var that = this;

  return new Promise(function (resolve, reject) {
    SeriesBuilder.requireLoaded(that.series).then(function (loadedSeries) {
      resolve(that.transformer(loadedSeries));
    });
  });
}