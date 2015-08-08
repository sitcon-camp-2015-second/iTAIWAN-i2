
function App() {
  App.initMap();
  App.loadHotspotData();

  App.locateButton.init();
  App.searchBox.init();
};

App.initMap = function() {
  // initialize Leaflet
  App.map = L.map('mapContainer', {
    minZoom: 9,
    maxBounds: App.config.boundary
  });

  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    // buffer: 4,
    bounds: App.config.boundary,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(App.map);

  App.map.setView(App.config.initialPosition, 11);

  App.map
    .on('locationfound', App.onLocationFound)
    .on('locationerror', App.onLocationError);
}

App.loadHotspotData = function() {
  $.ajax({
    url: 'hotspotlist.csv',
    success: function(resp) {
      var hotspotMarkers = new L.MarkerClusterGroup(App.config.clusterConf);
      var coll = App.hotspotColl = App.Util.csv2json(resp, ["owner", "area", "name", "addr", "lat", "lng"]);
      var hs, mkr;
      var hotspotCat = {};
      // add the icon
      for (var i = 0, c = coll.length; i < c; i++) {
        hs = coll[i];
        if (!hotspotCat[hs.area]) {
          hotspotCat[hs.area] = [];
        }
        hotspotCat[hs.area].push(hs);
      }

      for (var x in hotspotCat) {
        var hotspotList = [];
        for (var i = 0, c = hotspotCat[x].length; i < c; i++) {
          hs = hotspotCat[x][i];
          mkr = new L.marker([hs.lat, hs.lng], { title: hs.name });
          mkr.bindPopup('<h4 class="title">' + hs.name + '</h4><p class="address">' + hs.addr + '</p>');
          hs._marker = mkr;
          hotspotList.push(mkr);
        }
        hotspotMarkers.addLayers(hotspotList);
      }
      App.map.addLayer(hotspotMarkers);
    }
  });
};

App.config = {
  boundary: [[21.5, 119], [25.5, 123]],
  clusterConf: {
    disableClusteringAtZoom: 14,
    spiderfyDistanceMultiplier: 3
  },
  initialPosition: [25.059, 121.557],
  searchResultLimit: 200
};

App.Util = {
  rexQuoteStrip: /^\s*"(.*)"\s*$/,
  csv2json: function(csv, headers) {
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
        if (matched = row[j].match(App.Util.rexQuoteStrip)) {
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
  },
  distanceRound: function(dist) {
    // prevent round-off error
    return Math.round((dist + 1e-14) * 10) / 10;
  }
};

App.searchBox = {
  prevVal: null,
  $searchBox: $('#searchBox'),
  $searchResult: $('#search-result'),
  init: function() {
    this.$searchBox.on('keyup blur change', this.updateSearchResult);
    this.$searchResult.on('click', 'li', this.goSearchResult);
  },
  goSearchResult: function() {
    var idx = $(this).data('idx');
    var hs = App.hotspotColl[idx];
    if (!idx || !hs) return false;
    App.map.setView([hs.lat, hs.lng], 14);
    hs._marker.openPopup();
  },
  updateSearchResult: function() {
    var val = $(this).val().toLowerCase();
    var coll = App.hotspotColl;
    var self = App.searchBox;
    if ((self.prevVal && self.prevVal == val))
      return false;
    self.prevVal = val;
    if (!val) {
      self.$searchResult.html('');
    } else {
      var resultSet = [];
      for (var i = 0, c = coll.length; i < c; i++) {
        if (coll[i].name.toLowerCase().indexOf(val) >= 0
        || coll[i].addr.toLowerCase().indexOf(val) >= 0) {
          resultSet.push(i);
        }
      }
      if (resultSet.length) {
        var buf = '';
        for (var i = 0, c = Math.min(resultSet.length, App.config.searchResultLimit); i < c; i++) {
          var hs = coll[resultSet[i]];
          var dist = hs._distance;
            buf += '<li data-idx="'
              + resultSet[i] + '">' + hs.name
              + (dist ? (
                  '<span class="small float-right">'
                    + App.Util.distanceRound(dist)
                    + ' m</span><div class="clearfix"></div>')
                : '')
              + '</li>';
        }
        self.$searchResult.html(buf);
      }
      else
        self.$searchResult.html('查無結果');
    }
  }
};

App.locateButton = {
  $el: $('#locateButton'),
  init: function() {
    this.setState(true);
    this.$el.click(this.onClick);
  },
  onClick: function() {
    App.locateButton.setState(false);
    App.map.locate({
      enableHighAccuracy: true,
      timeout: 60 * 1000
    });
  },
  setState: function(nextState) {
    if (nextState) {
      // enable
      this.$el.removeAttr('disabled').html('定位');
    } else {
      // disable
      this.$el.html('定位中...').attr('disabled', 'disabled');
    }
  }
}

App.currPos = {
  icon: new L.Icon.Default({
    iconUrl: 'images/marker-icon-green.png',
    iconRetinaUrl: 'images/marker-icon-green@2x.png'
  })
};

App.onLocationFound = function(evt) {
  var currPos = App.currPos;
  var coll = App.hotspotColl;

  App.map.setView(evt.latlng, 15);
  currPos.marker = currPos.marker || L.marker(evt.latlng, {
    icon: currPos.icon,
    // force top
    zIndexOffset: 1e8,
    title: '現在位置'
  })
    .bindPopup('<h4 class="title">現在位置</h4>')
    .addTo(App.map);

  // open the popup of current position?
  // currPos.marker.openPopup();

  // calculate distance
  var distance = [];
  for (var i = 0, c = coll.length; i < c; i++) {
    var hs = coll[i];
    var dist = evt.latlng.distanceTo([hs.lat, hs.lng]);
    hs._distance = dist;
    distance.push(dist);
  }

  // sort the original collection
  coll.sort(function(a, b) {
    return a._distance - b._distance;
  });

  var nearestHS = coll[0];

  $('#nearestInfo').html('距離最近的熱點是：<br>'
    + '<b>' + nearestHS.name + '</b>' + '，' + nearestHS.addr + '，<br/>'
    + '距離約' + App.Util.distanceRound(coll[0]._distance) + '公尺。');

  App.locateButton.setState(true);
};

App.onLocationError = function(evt) {
  alert('定位失敗，這一定不是程式的bug XDDD');
  App.locateButton.setState(true);
};

var app = new App();
