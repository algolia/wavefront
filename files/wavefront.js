
var net = require('net'),
   util = require('util');

var debug;
var flushInterval;
var wavefrontHost;
var wavefrontPort;
var wavefrontTagPrefix;
var defaultSource;

// prefix configuration
var globalPrefix;
var prefixPersecond;
var prefixCounter;
var prefixTimer;
var prefixGauge;
var prefixSet;

// set up namespaces
var legacyNamespace = false;
var globalNamespace  = [];
var counterNamespace = [];
var timerNamespace   = [];
var gaugesNamespace  = [];
var setsNamespace     = [];

var wavefrontStats = {};

var postStats = function wavefrontPostStats(statString) {
	
  var last_flush = wavefrontStats.last_flush || 0;
  var last_exception = wavefrontStats.last_exception || 0;
  if (wavefrontHost) {
    try {
      var wavefront = net.createConnection(wavefrontPort, wavefrontHost);
      wavefront.addListener('error', function(connectionException){
        if (debug) {
          util.log(connectionException);
        }
      });
      wavefront.on('connect', function() {
        var ts = Math.round(new Date().getTime() / 1000);
        var namespace = globalNamespace.concat('statsd');
		if (debug) {
			util.log(statString)
		}
        this.write(statString);
        this.end();
        wavefrontStats.last_flush = Math.round(new Date().getTime() / 1000);
      });
    } catch(e){
      if (debug) {
        util.log(e);
      }
      wavefrontStats.last_exception = Math.round(new Date().getTime() / 1000);
    }
  }
}

function parseTags(metricName) {
  var tags = [];
  //stats.gauges.gauge1~tag=val~tag2=val2
  var tagParts = metricName.split(wavefrontTagPrefix);
  for (var i=1;i<tagParts.length;i++) {
    if (i > 0) {
      tags.push(tagParts[i]);	
    }
  }
 
  if (("|" + tags.join("|")).indexOf("|source=") == -1) {
    tags.push("source="+defaultSource);
  }
  return tags;
}


// Strips tags out of metric name
function stripTags(metricName) {
  return metricName.split(wavefrontTagPrefix)[0];
}


var flushStats = function wavefrontFlush(ts, metrics) {
  var suffix = "\n";
  var starttime = Date.now();
  var statString = '';
  var numStats = 0;
  var key;
  var timerData_key;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var sets = metrics.sets;
  var timerData = metrics.timer_data;
  var statsd_metrics = metrics.statsd_metrics;

  for (key in counters) {
    var tags = parseTags(key);
    var strippedKey = stripTags(key)

    var namespace = counterNamespace.concat(strippedKey);
    var value = counters[key];

    if (legacyNamespace === true) {
      statString += 'stats_counts.' + key + ' ' + value + ' ' + ts + ' ' + tags.join(' ') + suffix;
    } else {
      statString += namespace.concat('count').join(".") + ' ' + value + ' ' + ts + ' ' + tags.join(' ') + suffix;
    }

    numStats += 1;
  }

  for (key in timerData) {
    if (Object.keys(timerData).length > 0) {
      for (timerData_key in timerData[key]) {
        var tags = parseTags(key);
        var strippedKey = stripTags(key)

        var namespace = timerNamespace.concat(strippedKey);
        var the_key = namespace.join(".");
        statString += the_key + '.' + timerData_key + ' ' + timerData[key][timerData_key] + ts + ' ' + tags.join(' ') + suffix;
      }

      numStats += 1;
    }
  }

  for (key in gauges) {
    var tags = parseTags(key);
    var strippedKey = stripTags(key)

    var namespace = gaugesNamespace.concat(strippedKey);
    statString += namespace.join(".") + ' ' + gauges[key] + ' ' + ts + ' ' + tags.join(' ') + suffix;
    numStats += 1;
  }

  for (key in sets) {
    var tags = parseTags(key);
    var strippedKey = stripTags(key)

    var namespace = setsNamespace.concat(strippedKey);
    statString += namespace.join(".") + '.count ' + sets[key].values().length + ' ' + ts + ' ' + tags.join(' ') + suffix;
    numStats += 1;
  }

  var namespace = globalNamespace.concat('statsd');
  if (legacyNamespace === true) {
    statString += 'statsd.numStats ' + numStats + ' ' + ts + suffix;
    statString += 'stats.statsd.wavefrontStats.calculationtime ' + (Date.now() - starttime) + ' ' + ts + suffix;
    for (key in statsd_metrics) {
      statString += 'stats.statsd.' + key + ' ' + statsd_metrics[key] + ' ' + ts + suffix;
    }
  } else {
	//manually add source tag
    statString += namespace.join(".") + '.numStats ' + numStats + ts + ' source='+defaultSource + ' ' + suffix;
    for (key in statsd_metrics) {
      var the_key = namespace.concat(key);
      statString += the_key.join(".") + ' ' + statsd_metrics[key] + ts + ' source='+defaultSource + ' ' + suffix;
    }
  }
  postStats(statString);
};

var backendStatus = function wavefrontStatus(writeCb) {
  for (stat in wavefrontStats) {
    writeCb(null, 'wavefront', stat, wavefrontStats[stat]);
  }
};

exports.init = function wavefrontInit(startup_time, config, events) {
  debug = config.debug;
  wavefrontHost = config.wavefrontHost;
  wavefrontPort = config.wavefrontPort;
  defaultSource = config.defaultSource;
  wavefrontTagPrefix = config.wavefrontTagPrefix;
  config.wavefront = config.wavefront || {};
  globalPrefix    = config.wavefront.globalPrefix;
  prefixCounter   = config.wavefront.prefixCounter;
  prefixTimer     = config.wavefront.prefixTimer;
  prefixGauge     = config.wavefront.prefixGauge;
  prefixSet       = config.wavefront.prefixSet;
  
  //LegacyNamespace support is depricated!	
  //legacyNamespace = config.wavefront.legacyNamespace;

  // set defaults for prefixes
  globalPrefix  = globalPrefix !== undefined ? globalPrefix : "stats";
  prefixCounter = prefixCounter !== undefined ? prefixCounter : "counters";
  prefixTimer   = prefixTimer !== undefined ? prefixTimer : "timers";
  prefixGauge   = prefixGauge !== undefined ? prefixGauge : "gauges";
  prefixSet     = prefixSet !== undefined ? prefixSet : "sets";
  legacyNamespace = legacyNamespace !== undefined ? legacyNamespace : false;


  if (legacyNamespace === false) {
    if (globalPrefix !== "") {
      globalNamespace.push(globalPrefix);
      counterNamespace.push(globalPrefix);
      timerNamespace.push(globalPrefix);
      gaugesNamespace.push(globalPrefix);
      setsNamespace.push(globalPrefix);
    }

    if (prefixCounter !== "") {
      counterNamespace.push(prefixCounter);
    }
    if (prefixTimer !== "") {
      timerNamespace.push(prefixTimer);
    }
    if (prefixGauge !== "") {
      gaugesNamespace.push(prefixGauge);
    }
    if (prefixSet !== "") {
      setsNamespace.push(prefixSet);
    }
  } else {
      globalNamespace = ['stats'];
      counterNamespace = ['stats'];
      timerNamespace = ['stats', 'timers'];
      gaugesNamespace = ['stats', 'gauges'];
      setsNamespace = ['stats', 'sets'];
  }

  wavefrontStats.last_flush = startup_time;
  wavefrontStats.last_exception = startup_time;

  flushInterval = config.flushInterval;

  events.on('flush', flushStats);
  events.on('status', backendStatus);

  return true;
};
