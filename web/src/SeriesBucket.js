var SeriesBucket = {};

SeriesBucket.create = function (start, end, intervalString) {
  var buckets = [];
  var intervalParse = intervalString.match(/^(\d+)(\w+)$/);
  var interval = moment.duration(parseInt(intervalParse[1], 10), intervalParse[2]).asSeconds() * 1000;

  var bucketstart = start - (start % interval);
  var bucketend = end - (end % interval);
  
  for (var time = bucketstart; time <= bucketend; time += interval) {
    buckets.push(time);
  }
  
  return buckets;
}

SeriesBucket.fill = function (buckets, series, intervalString) {
  var filled = {};
  var intervalParse = intervalString.match(/^(\d+)(\w+)$/);
  var interval = moment.duration(parseInt(intervalParse[1], 10), intervalParse[2]).asSeconds() * 1000;
  
  buckets.forEach(function (time) {
    filled[time] = [];
  })

  series.forEach(function (datapoint) {
    filled[datapoint.x - (datapoint.x % interval)].push(datapoint.y);
  });
  
  return filled;
}

SeriesBucket.createRight = function (start, end, intervalString) {
  var buckets = [];
  var intervalParse = intervalString.match(/^(\d+)(\w+)$/);
  var interval = moment.duration(parseInt(intervalParse[1], 10), intervalParse[2]).asSeconds() * 1000;

  var bucketstart = start + (start % interval);
  var bucketend = end + (end % interval);
  
  for (var time = bucketstart; time <= bucketend; time += interval) {
    buckets.push(time);
  }
  
  return buckets;
}

SeriesBucket.fillRight = function (buckets, series, intervalString) {
  var filled = {};
  var intervalParse = intervalString.match(/^(\d+)(\w+)$/);
  var interval = moment.duration(parseInt(intervalParse[1], 10), intervalParse[2]).asSeconds() * 1000;
  
  buckets.forEach(function (time) {
    filled[time] = [];
  })

  series.forEach(function (datapoint) {
    filled[datapoint.x + (datapoint.x % interval)].push(datapoint.y);
  });
  
  return filled;
}
