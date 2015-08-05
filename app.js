
var mapConf = {
  boundary: [[21.5, 119], [25.5, 123]],
  clusterConf: {
    disableClusteringAtZoom: 14,
    spiderfyDistanceMultiplier: 3
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

var hotspotColl = null;
var hotspotMarkers = new L.MarkerClusterGroup(mapConf.clusterConf);

// hotspotMarkers.on('clusterclick', function(evt) {
//   L.popup()
//     .setLatLng(evt.latlng)
//     .setContent('<p>Hello world!<br />This is a nice popup.</p>')
//     .openOn(map);
// });

$.ajax({
  url: 'hotspotlist.csv',
  success: function(resp) {
  //console.log(resp);
    hotspotColl = csv2json(resp, ["owner","area","name","addr","lng","lat"]);
    var hs, mkr;
    var hotspotCat = {};
    // add the icon
    for (var i = 0, c = hotspotColl.length; i < c; i++) {
      hs = hotspotColl[i];
      if (!hotspotCat[hs.area]) {
        hotspotCat[hs.area] = [];
      }
      hotspotCat[hs.area].push(hs);
    }

    for (var x in hotspotCat) {
      var hotspotList = [];
      for (var i = 0, c = hotspotCat[x].length; i < c; i++) {
        hs = hotspotCat[x][i];
        mkr = new L.marker([hs.lng, hs.lat], { title: hs.name });
        mkr.bindPopup('<h4 class="title">' + hs.name + '</h4><p class="address">' + hs.addr + '</p>');
        hs._marker = mkr;
        hotspotList.push(mkr);
      }
      hotspotMarkers.addLayers(hotspotList);
    }
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

var previousVal = null;
var $searchResult = $('#search-result');
$('#searchBox').on('keyup blur change', function() {
  var val = $(this).val().toLowerCase();
  if ((previousVal && previousVal == val))
    return false;
  if (!val) {
    $searchResult.html('');
  } else {
    var resultSet = [];
    for (var i = 0, c = hotspotColl.length; i < c; i++) {
      if (hotspotColl[i].name.toLowerCase().indexOf(val) >= 0) {
        resultSet.push(i);
      }
    }
    if (resultSet.length) {
      var buf = '';
      for (var i = 0; i < resultSet.length; i++) {
        buf += '<li data-idx="' + resultSet[i] + '">' + hotspotColl[resultSet[i]].name + '</li>';
      }
      $searchResult.html(buf);
    }
    else
      $searchResult.html('查無結果');
  }
})

$('#search-result').on('click', 'li', function() {
  var idx = $(this).data('idx');
  var hs = hotspotColl[idx];
  if (!idx || !hs) return false;
  map.setView([hs.lng, hs.lat], 14);
  hs._marker.openPopup();
})

var currPos;
var currPosIcon = L.icon({
  iconUrl: 'images/marker-icon-green.png',
  iconRetinaUrl: 'images/marker-icon-green@2x.png',
  shadowUrl: 'images/marker-shadow.png'
});
// cu

map.on('locationfound', function(evt) {
  map.setView(evt.latlng, 13);
  currPos = currPos || L.marker(evt.latlng, {
    icon: currPosIcon
  })
    .bindPopup('<h4 class="title">現在位置</h4>')
    .addTo(map);

  currPos.openPopup();

  $('#locateButton').removeAttr('disabled').html('定位');
}).on('locationerror', function(evt) {
  $('#locateButton').removeAttr('disabled').html('定位');
  alert('定位失敗，這一定不是程式的bug XDDD');

})

$('#locateButton').click(function() {
  $(this).html('定位中...').attr('disabled', 'disabled');
  map.locate({
    enableHighAccuracy: true,
    timeout: 60 * 1000
  });

})
