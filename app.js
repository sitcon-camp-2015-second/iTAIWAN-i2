
var mapConf = {
  boundary: [[21.5, 119], [25.5, 123]],
  clusterConf: {
  	disableClusteringAtZoom: 14
  }
};

(function(rexQuoteStrip) {
  csv2json = function(csv, headers) {
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
})(/^\s*"(.*)"\s*$/);

// test case:
// csv2json('111,222,333,"444"\n555,666,777,"888"\n,1,2,3', ['A','B','C','D'])

var hotspotColl = null;
var hotspotList = [];
var hotspotMarkers = new L.MarkerClusterGroup(mapConf.clusterConf);

$.ajax({
  url: 'hotspotlist.csv',
  success: function(resp) {
	//console.log(resp);
    hotspotColl = csv2json(resp, ["owner","area","name","addr","lng","lat"]);
    var hs, mkr;
    // add the icon
    for (var i = 0, c = hotspotColl.length; i < c; i++) {
      hs = hotspotColl[i];
      mkr = new L.marker([hs.lng, hs.lat], { title: hs.name });
      mkr.bindPopup('<h4 class="title">' + hs.name + '</h4><p class="address">' + hs.addr + '</p>');
      hotspotList.push(mkr);
      // L.marker([hs.lng, hs.lat]).addTo(map);
    }
    hotspotMarkers.addLayers(hotspotList);
    map.addLayer(hotspotMarkers);
  }
});

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
