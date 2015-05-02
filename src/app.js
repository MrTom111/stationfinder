var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');


// Show splash screen while waiting for data
var splashWindow = new UI.Window();

// Text element to inform user
var text = new UI.Text({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  text:'Suche GPS-Position...',
  font:'GOTHIC_24_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
});

// Add to splashWindow and show
splashWindow.add(text);
splashWindow.show();

var parseStations = function(data) {
  var items = [];
  for(var i = 0; i < data.pins.length; i++) {
    var station = data.pins[i].desc;
    var distance = data.pins[i].distance + 'm entfernt';
    
    // Add to menu items array
    items.push({
      title:station,
      subtitle:distance,
    });
  }
  // Finally return whole array
  return items;
};

var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 10000, 
  timeout: 10000
};

var lat; 
var lon;

function locationSuccess(pos) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  lat = pos.coords.latitude;
  lon = pos.coords.longitude;
  vrrCoordRequest();
}

function locationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
  splashWindow.remove(text);
  
  // Text element to inform user
  var errorText = new UI.Text({
    position: new Vector2(0, 0),
    size: new Vector2(144, 168),
    text:'Kein GPS-Signal empfangen. Bitte Einstellungen prüfen und App neu starten.',
    font:'GOTHIC_24_BOLD',
    color:'black',
    textOverflow:'wrap',
    textAlign:'center',
    backgroundColor:'white'
  });
  splashWindow.add(errorText);
}
 
function vrrCoordRequest(){
  //build URL
  var URL = 'http://app.vrr.de/standard/XML_COORD_REQUEST?outputFormat=JSON&language=de&stateless=1&coordOutputFormat=WGS84&' + 
          'coord=' + lon + ':' + lat + ':WGS84&max=10&inclFilter=1&radius_1=1000&type_1=STOP';
  
  //var URL = 'http://app.vrr.de/standard/XML_COORD_REQUEST?outputFormat=JSON&language=de&stateless=1&coordOutputFormat=WGS84&' + 
  //        'coord=' + '6.767' + ':' + '51.5' + ':WGS84&max=10&inclFilter=1&radius_1=1000&type_1=STOP';
  
  // Make the request
  ajax(
    {
      url: URL,
      type: 'json'
    },
    function(data) {
      // Success!
      console.log('Successfully fetched stations for coords!');
      console.log('URL: ' + URL);
      var menuItems = parseStations(data);
  
      // Construct Menu to show to user
      var stationListMenu = new UI.Menu({
        sections: [{
          title: 'Haltestellen',
          items: menuItems
        }]
      });
      
      // Add an action for SELECT
      stationListMenu.on('select', function(e) {
        // Get that forecast
        var stationID = data.pins[e.itemIndex].id;
        var stationName = data.pins[e.itemIndex].desc;
        vrrStationRequest(stationID, stationName, stationListMenu);
      });
            
      // Show the Menu, hide the splash
      stationListMenu.show();
      splashWindow.hide();
      
    },
    function(error) {
      // Failure!
      console.log('Failed fetching station data: ' + error);
    }
  );
}

var parseLines = function(data) {
  var lines = [];
  for(var i = 0; i < data.departureList.length; i++) {
    var number = data.departureList[i].servingLine.number;
    var direction = data.departureList[i].servingLine.direction;
    var countdown = data.departureList[i].countdown;
    
    
    // Add to menu items array
    lines.push({
      title:number + ' (' + direction + ')',
      subtitle:'In ' + countdown + ' Minuten',
    });
  }
  // Finally return whole array
  return lines;
};

function vrrStationRequest(stationID, stationName, stationListMenu){
  
  //Datum und Uhrzeit bestimmen  
  var jetzt = new Date();
  var jahr = jetzt.getFullYear();
  var monat = jetzt.getMonth();
  monat = monat + 1;
  if (monat < 10){
    monat = '0' + monat;
  }
  var tag = jetzt.getDate();
  var datum = jahr + monat + tag;  
  var stunden = jetzt.getHours().toString();
  stunden = ((stunden < 10) ? "0" + stunden : stunden);
  var minuten = jetzt.getMinutes().toString();
  minuten = ((minuten < 10) ? "0" + minuten : minuten);
  var zeit = stunden + minuten;
    
  var stationURL = 'http://app.vrr.de/standard/XSLT_DM_REQUEST?outputFormat=JSON&language=de&stateless=1&coordOutputFormat=WGS84&' + 
                    'type_dm=stop&name_dm=' + stationID + '&itdDate=' + datum + '&itdTime=' + zeit + '&useRealtime=1&mode=direct&' +
                    'ptOptionsActive=1&deleteAssignedStops_dm=1&mergeDep=1&limit=10';
  
  console.log(stationURL);
  // Make the request
  ajax(
    {
      url: stationURL,
      type: 'json'
    },
    function(data) {
      // Success!
      console.log('Successfully fetched station data!');
      
      var menuItemsLines = parseLines(data);
       
      // Construct Menu to show to user
      var resultsMenuLines = new UI.Menu({
        sections: [{
          title: stationName,
          items: menuItemsLines
        }]
      });
     
      // Show the new Menu
      resultsMenuLines.show();      
    },
    function(error) {
      // Failure!
      console.log('Failed fetching station data: ' + error);
    }
  );
   
}

navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);


