"use strict";

function parseDate(datestr) {
  var parsed = datestr.split("-");
  var year = parsed[0];
  var month = parsed[1] - 1; //Javascript months index from 0 instead of 1
  var day = parsed[2];

  return Date.UTC(year, month, day);
}

function updateContent(graphTitle, testName, measure) {

  var measureDescription;
  if (measure === "checkerboard") {
    measureDescription = 'The measure is the sum of the percentages of frames that are checkerboarded over the entire capture. Lower values are better.';
  } else if (measure === "fps") {
    measureDescription = 'The measure is a calculation of the average number of UNIQUE frames per second of capture. The theoretical maximum is 60 fps (which is what we are capturing), but note that if there periods where the page being captured is unchanging this number may be aritifically low.';
  } else {
    measureDescription = 'The measure is a calculation of the total number of UNIQUE frames in the capture. Higher values generally indicate more fluid animations.';
  }

  $('#content').html(ich.graph({'title': graphTitle,
                                'measureDescription': measureDescription
                               }));
  $('#measure-'+measure).attr("selected", "true");
  $('#measure').change(function() {
    var newMeasure = $(this).val();
    window.location.hash = '/' + [ testName, newMeasure ].join('/');
  });
}

function updateGraph(rawdata, measure) {
  // show individual data points
  var graphdata = [];
  var color = 0;
  var metadataHash = {};

  var seriesIndex = 0;
  var minMaxDates;
  Object.keys(rawdata).sort().forEach(function(type) {
    metadataHash[seriesIndex] = [];

    // point graph
    var series1 = {
      label: type,
      points: { show: true },
      color: color,
      data: []
    };


    var prevRevision = null;
    Object.keys(rawdata[type]).sort().forEach(function(datestr) {
      rawdata[type][datestr].forEach(function(sample) {
        series1.data.push([ parseDate(datestr), sample[measure] ]);
        metadataHash[seriesIndex].push({
          'videoURL': sample.video,
          'dateStr': datestr,
          'appDate': sample.appdate,
          'revision': sample.revision,
          'prevRevision': prevRevision,
          'buildId': sample.buildid
        });
      });
      prevRevision = rawdata[type][datestr][0].revision;
    });
    graphdata.push(series1);

    var dates = series1.data.map(function(d) { return d[0]; });
    minMaxDates = [ Math.min.apply(null, dates), Math.max.apply(null, dates) ];

    // line graph (aggregate average per day)
    var series2 = {
      hoverLabel: "Average per day for " + type,
      lines: { show: true },
      color: color,
      data: [],
      clickable: false,
      hoverable: false
    };
    Object.keys(rawdata[type]).forEach(function(datestr) {
      var numSamples = 0;
      var total = 0;
      rawdata[type][datestr].forEach(function(sample) {
        total += sample[measure];
        numSamples++;
      });

      series2.data.push([parseDate(datestr), total/numSamples]);
    });
    series2.data.sort();
    graphdata.push(series2);

    color++;
    seriesIndex += 2;
  });

  var axisLabel;
  if (measure == "checkerboard") {
    axisLabel = "Checkerboard";
  } else if (measure === "uniqueframes") {
    axisLabel = "Unique frames";
  } else {
    axisLabel = "Frames per second";
  }

  var plot = $.plot($("#graph-container"), graphdata, {
    xaxis: {
      mode: "time",
      timeformat: "%0m-%0d"
    },
    yaxis: {
      axisLabel: axisLabel,
      min: 0
    },
    legend: {
      container: $("#legend"),
    },
    grid: { clickable: true, hoverable: true },
    zoom: { interactive: true },
    pan: { interactive: true }
  });

    // add zoom out button
  $('<div class="button" style="right:20px;top:20px">zoom out</div>').appendTo($("#graph-container")).click(function (e) {
        e.preventDefault();
        plot.zoomOut();
  });

  function showTooltip(x, y, contents) {
      $('<div id="tooltip">' + contents + '</div>').css( {
          position: 'absolute',
          display: 'none',
          top: y + 5,
          left: x + 5,
          border: '1px solid #fdd',
          padding: '2px',
          'background-color': '#fee',
          opacity: 0.80
      }).appendTo("body").fadeIn(200);
  }

  // Plot Hover tooltip
  var previousPoint = null;
  $("#graph-container").bind("plothover", function (event, pos, item) {
    if (item) {
      if (previousPoint != item.dataIndex) {
        var toolTip;
        var x = item.datapoint[0].toFixed(2),
            y = item.datapoint[1].toFixed(2);

        if (metadataHash[item.seriesIndex] && metadataHash[item.seriesIndex][item.dataIndex]) {
          var metadata = metadataHash[item.seriesIndex][item.dataIndex];
          toolTip = (item.series.label || item.series.hoverLabel) + " of " + (metadata.appDate || "'Unknown Date'") + " = " + y;
        } else {
          console.log(JSON.stringify(item.series));
          toolTip = (item.series.label || item.series.hoverLabel) + " = " + y;
        }

        previousPoint = item.dataIndex;

        $("#tooltip").remove();
        showTooltip(item.pageX, item.pageY, toolTip);
      }
    } else {
      $("#tooltip").remove();
      previousPoint = null;
    }
  });

  $("#graph-container").bind("plotclick", function (event, pos, item) {
    plot.unhighlight();
    if (item) {
      var metadata = metadataHash[item.seriesIndex][item.dataIndex];
      $('#datapoint-info').html(ich.graphDatapoint({ 'videoURL': metadata.videoURL,
                                                     'measureName': measure,
                                                     'date': metadata.dateStr,
                                                     'appDate': metadata.appDate,
                                                     'revision': metadata.revision,
                                                     'prevRevision': metadata.prevRevision,
                                                     'buildId': metadata.buildId,
                                                     'measureValue': Math.round(100.0*item.datapoint[1])/100.0
                                                   }));
      $('#videoContainer').css('position', 'relative');
      $('#videoContainer').css('z-index', '2');
      $('#videoContainer').css('float', 'right');
      $('#video').css('width', $('#video').parent().parent().width());
      $('#video').css('position', 'relative');
      $('#video').css('background-color', 'black');
      $('.videoControl').hide();
      $('#video').focus(function() {
        $('#videoContainer').css('width', $('#video').parent().width());
        $('#videoContainer').animate({ width: 600}, 1000);
        $('#video').css('width', '');
        $('.videoControl').show();
      });
      $('#videoControlClose').click(function() {
        $('#videoContainer').stop();
        $('#videoContainer').css('width', '');
        $('#video').css('width', $('#video').parent().parent().width());
        $('.videoControl').hide();
      });

      $("#video").mousemove(function(e){
        var offset = $(this).offset();
        lastVideoX = Math.floor(e.pageX - offset.left);
        lastVideoY = Math.floor(e.pageY - offset.top);
        updateVideoLabel();
      });

      $("#video").bind("timeupdate", function() {
        updateVideoLabel();
      });

      // Controls
      $('#videoControlPause').click(function() {
        $('#video').get(0).pause();
      });
      $('#videoControlPrevFrame').click(function() {
        seekFrame($('#video').get(0), -1, 60);
      });
      $('#videoControlNextFrame').click(function() {
        seekFrame($('#video').get(0), 1, 60);
      });

      plot.highlight(item.series, item.datapoint);
    } else {
      $('#datapoint-info').html(null);
    }
  });
}

var lastVideoX = null;
var lastVideoY = null; 
var canvas = null;
function updateVideoLabel() {
  var video = $('#video').get(0);
  var currentFrame = Math.round(video.currentTime * 60);
  $('#videoLabelFrame').text(currentFrame);

  if (!canvas || canvas.width != video.videoWidth || canvas.height != video.videoHeight) {
    canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  var ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  var frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var l = frame.data.length / 4;
  var pixels = 0;
  for (var i = 0; i < l; i++) {
    var r = frame.data[i * 4 + 0];
    var g = frame.data[i * 4 + 1];
    var b = frame.data[i * 4 + 2];
    // This is really nasty but because of the compression
    // the magic color can be anywhere within this range :(
    if (r >= 250 && g === 0 && b >= 250) {
      pixels++;
    }
  }
  $('#videoLabelPixels').text(pixels);
  $('#videoLabelMouse').text(lastVideoX + "," + lastVideoY);

  // Update mouse over canvas
  var mouseOverCanvas = $("#videoLabelMouseOver").get(0);
  if (true || mouseOverCanvas.lastVideoX !== lastVideoX ||
      mouseOverCanvas.lastVideoY !== lastVideoY) {
    var mouseOverCtx = mouseOverCanvas.getContext("2d");
    mouseOverCtx.clearRect(0, 0, canvas.width, canvas.height);
    var posX = 0;
    var posY = 0;
    $('#videoLabelMouseR').text("");
    $('#videoLabelMouseG').text("");
    $('#videoLabelMouseB').text("");
    for (var x = lastVideoX - 2; x <= lastVideoX + 2; x++) {
      for (var y = lastVideoY - 2; y <= lastVideoY + 2; y++) {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
          mouseOverCtx.beginPath();
          mouseOverCtx.moveTo(posX * 10, posY * 10);
          mouseOverCtx.lineTo(posX * 10 + 9, posY * 10);
          mouseOverCtx.lineTo(posX * 10, posY * 10 + 9);
          mouseOverCtx.lineTo(posX * 10, posY * 10);
          mouseOverCtx.lineTo(posX * 10 + 9, posY * 10 + 9);
          mouseOverCtx.moveTo(posX * 10, posY * 10);
          mouseOverCtx.stroke();
          posY++;
          continue;
        }
        var r = frame.data[(y*canvas.width + x) * 4 + 0];
        var g = frame.data[(y*canvas.width + x) * 4 + 1];
        var b = frame.data[(y*canvas.width + x) * 4 + 2];
        if (x === lastVideoX && y === lastVideoY) {
          $('#videoLabelMouseR').text(r);
          $('#videoLabelMouseG').text(g);
          $('#videoLabelMouseB').text(b);
        }
        console.log("line: " + lastVideoX + ", " + x);
        mouseOverCtx.fillStyle = "rgb(" + r + "," + g + "," + b +")";
        mouseOverCtx.fillRect(posX * 10, posY * 10, 10, 10);
        posY++;
      }
      posY = 0;
      posX++;
    }
    mouseOverCtx.fillStyle = "rgb(0,0,0)";
    mouseOverCtx.strokeRect(20, 20, 10, 10);
  }

};

function seekFrame(video, deltaFrame, fps) {
  if (video.paused == false) {
    video.pause();
  }

  var currentFrames = video.currentTime * fps;
  var newPos = (currentFrames + deltaFrame) / fps;
  video.currentTime = newPos;

  // Wait until the next frame is ready
  setTimeout(function() {
    updateVideoLabel();  
  }, 300);
}

$(function() {
  var testInfoDict = {
    'taskjs-scrolling': {
      'key': 'taskjs',
      'graphTitle': 'Scrolling on taskjs.org'
    },
    'nightly-zooming': {
      'key': 'nightly',
      'graphTitle': 'Mozilla Nightly Zooming Test'
    },
    'nytimes-scrolling': {
      'key': 'nytimes-scroll',
      'graphTitle': 'New York Times Scrolling Test'
    },
    'nytimes-zooming': {
      'key': 'nytimes-zoom',
      'graphTitle': 'New York Times Zooming Test'
    },
    'cnn': {
      'key': 'cnn',
      'graphTitle': 'CNN.com Test'
    },
    'canvas-clock': {
      'key': 'clock',
      'graphTitle': 'Canvas Clock Test'
    },
    'reddit': {
      'key': 'reddit',
      'graphTitle': 'Reddit test'
    },
    'imgur': {
      'key': 'imgur',
      'graphTitle': 'imgur test'
    },
    'wikipedia': {
      'key': 'wikipedia',
      'graphTitle': 'wikipedia test'
    }
  }

  var baseRoute = "/(" + Object.keys(testInfoDict).join("|") + ")";
  var tmp = {};
  tmp[baseRoute] = {
    '/(checkerboard|fps|uniqueframes)': {
      on: function(test, measure) {
        $('#functions').children('li').removeClass("active");
        $('#functions').children('#'+test+'-li').addClass("active");

        var testInfo = testInfoDict[test];
        updateContent(testInfo.graphTitle, test, measure);

        $.getJSON('data.json', function(rawData) {
          updateGraph(rawData[testInfo.key], measure);
        });
      }
    }
  };
  var router = Router(tmp).init('/taskjs-scrolling/checkerboard');

});
