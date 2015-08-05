
var rexQuoteStrip = /^\s*"(.*)"\s*$/;

function csv2json(csv, headers) {
  var rtn = [];
  var rows = csv.split('\n');
  var row;
  var obj;
  var matched;
  for (var i = 0, c = rows.length; i < c; i++) {
    row = rows[i].split(',');
    obj = {};
    for (var j = 0, d = headers.length; j < d; j++) {
      if (row[j] == null)
        continue;
      if (matched = row[j].match(rexQuoteStrip)) {
        row[j] = matched[1];
      } else if (!isNaN(matched = parseFloat(row[j]))) {
      	// convert to number if possible
      	row[j] = matched;
      }
      obj[headers[j]] = row[j];
    }
    rtn.push(obj);
  }
  return rtn;
}

// test case:
// csv2json('111,222,333,"444"\n555,666,777,"888"\n,1,2,3', ['A','B','C','D'])

$.ajax({
  url: 'hotspotlist.csv',
  success: function(resp) {
	//console.log(resp);
    console.log(csv2json(resp, ["owner","area","name","addr","lng","lat"]))
  }
});

var mapConf = {
  boundary: [[21.5, 119], [25.5, 123]]
};


// load OSM
var map = L.map('mapContainer', {
  minZoom: 9,
  maxBounds: mapConf.boundary
}).setView([25.059, 121.557], 11);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  // buffer: 4,
  bounds: mapConf.boundary,
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
