function HighchartsGraph(target, options) {
  this.target = target || document.body;
  this.options = options || {};
  this.series = [];
}

HighchartsGraph.prototype.setOptions = function (options) {
  this.options = options;
  
  return this;
}

HighchartsGraph.prototype.addSeries = function (seriesList) {
  this.series.push(seriesList);
  
  return this;
};

HighchartsGraph.prototype.render = function () {
  var options = Object.clone(this.options);
  options.chart = options.chart || {};
  options.chart.renderTo = this.target;

  options.credits = options.credits || {};
  options.credits.enabled = false;

  options.xAxis = options.xAxis || {};
  options.xAxis.type = options.xAxis.type || 'datetime';
  options.xAxis.units = options.xAxis.units || [
    [
      'minute',
      [ 1, 5, 10, 15, 30 ]
    ],
    [
      'hour',
      [ 1 ]
    ]
  ];

  options.yAxis = options.yAxis || [];
  
  if (!Array.isArray(options.yAxis)) {
    options.yAxis = [ options.yAxis ];
  }

  options.yAxis[0] = options.yAxis[0] || {};
  
  options.plotOptions = options.plotOptions || {};
  options.plotOptions.series = options.plotOptions.series || {};
  options.plotOptions.series.animation = ('animation' in options.plotOptions.series) ? options.plotOptions.series.animation : false;
  options.plotOptions.series.marker = options.plotOptions.series.marker || {};
  options.plotOptions.series.marker.enabled = false;
  
  options.series = options.series || [];
  
  var loadedSeriesCount = 0;
  var expectedSeriesCount = this.series.length;
  
  var orderedSeries = {};

  this.series.forEach(function (seriesList, outerIdx) {
    SeriesBuilder.requireLoaded(seriesList).then(function (loadedSeries) {
      orderedSeries[outerIdx] = {};

      SeriesBuilder.requireSeriesList(loadedSeries).forEach(function (loadedSeries, innerIdx) {
        var seriesOptions = loadedSeries.options;
        seriesOptions.data = loadedSeries.data;
        
        if ('alpha' in seriesOptions) {
          seriesOptions.fillOpactiy = seriesOptions.alpha;
          delete seriesOptions.alpha;
        }
        
        if ('stack' in seriesOptions) {
          options.chart.type = options.chart.type || 'areaspline';

          seriesOptions.stacking = 'normal';
        }
        
        if (seriesOptions.yAxis) {
          options.yAxis[1] = options.yAxis[1] || {};
          options.yAxis[1].opposite = true;
        }

        orderedSeries[outerIdx][innerIdx] = seriesOptions;
      });
      
      loadedSeriesCount += 1;
      
      if (expectedSeriesCount == loadedSeriesCount) {
        options.chart.type = options.chart.type || 'spline';

        Object.forEach(
          orderedSeries,
          function (v) {
            Object.forEach(
              v,
              function (v) {
                if ('threshold' == v.mode) {
                  options.yAxis[v.yAxis || 0].plotLines = options.yAxis[v.yAxis || 0].plotLines || [];
                  options.yAxis[v.yAxis || 0].plotLines.push({
                    value : v.data[0].y,
                    color : v.color,
                    width : v.lineWidth || 1,
                    label : {
                      text : v.name
                    }
                  });
                  
                  return;
                } else {
                  options.series.push(v);
                }
              }
            );
          }
        );

        new Highcharts.Chart(options);
      }
    })
  });
  
  if (0 == expectedSeriesCount) {
    new Highcharts.Chart(options);
  }
};
