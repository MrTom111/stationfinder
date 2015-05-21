var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');


// Show splash screen while waiting for data
var splashWindow = new UI.Window();

var splashPic = new UI.Image({
  position: new Vector2(0, 0),
  size: new Vector2(144, 121),
  image:'images/splash.png'
});

// Text element to inform user
var GPStext = new UI.Text({
  position: new Vector2(0, 121),
  size: new Vector2(144, 47),
  text:'Suche GPS-Position...',
  font:'GOTHIC_18',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
});

// Add to splashWindow and show
splashWindow.add(splashPic);
splashWindow.add(GPStext);
splashWindow.show();

var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 20000, 
  timeout: 20000
};

function locationSuccess(pos) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  vrrCoordRequest(pos.coords.latitude, pos.coords.longitude);
}

function locationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
  splashWindow.remove(GPStext);
  splashWindow.remove(splashPic);
  
  // Text element to inform user
  var errorText = new UI.Text({
    position: new Vector2(0, 0),
    size: new Vector2(144, 168),
    text:'Kein GPS-Signal empfangen. Bitte Standort- Einstellungen prüfen und App neu starten.',
    font:'GOTHIC_24_BOLD',
    color:'black',
    textOverflow:'wrap',
    textAlign:'center',
    backgroundColor:'white'
  });
  splashWindow.add(errorText);
}
 
function vrrCoordRequest(lat, lon){
  //build URL
  var URL = 'http://app.vrr.de/standard/XML_COORD_REQUEST?outputFormat=JSON&coordOutputFormat=WGS84&' + 
          'coord=' + lon + ':' + lat + ':WGS84&max=10&inclFilter=1&radius_1=1000&type_1=STOP';
  
  //var URL = 'http://app.vrr.de/standard/XML_COORD_REQUEST?outputFormat=JSON&coordOutputFormat=WGS84&' + 
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
      var menuItems = getStationsFromJSON(data);
  
      // Construct Menu to show to user
      var stationListMenu = new UI.Menu({
        sections: [{
          title: 'Haltestellen',
          items: menuItems
        }]
      });
      
      // Add an action for SELECT
      stationListMenu.on('select', function(entry) {
        // Get data for station
        var stationID = data.pins[entry.itemIndex].id;
        var stationName = data.pins[entry.itemIndex].desc;
        vrrStationRequest(stationID, stationName);
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

function getStationsFromJSON(data) {
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
}

function vrrStationRequest(stationID, stationName){
  
  //Datum und Uhrzeit bestimmen  
  var jetzt = new Date();
  var jahr = jetzt.getFullYear();
  var monat = jetzt.getMonth();
  monat = monat + 1;
  if (monat < 10){
    monat = '0' + monat;
  }
  var tag = jetzt.getDate();
   if (tag < 10){
    tag = '0' + tag;
  }  
  var datum = jahr + monat + tag;  
  var stunden = jetzt.getHours().toString();
  stunden = ((stunden < 10) ? "0" + stunden : stunden);
  var minuten = jetzt.getMinutes().toString();
  minuten = ((minuten < 10) ? "0" + minuten : minuten);
  var zeit = stunden + minuten;
    
  var stationURL = 'http://app.vrr.de/standard/XSLT_DM_REQUEST?outputFormat=JSON&coordOutputFormat=WGS84&type_dm=stop&' + 
                    'name_dm=' + stationID + '&itdDate=' + datum + '&itdTime=' + zeit + '&useRealtime=1&mode=direct&limit=10';
  
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
      
      var menuItemsDepartures = getDeparturesFromJSON(data);
       
      // Construct Menu to show to user
      var resultsMenuDepartures = new UI.Menu({
        sections: [{
          title: stationName,
          items: menuItemsDepartures
        }]
      });
     
      // Add an action for SELECT
      resultsMenuDepartures.on('select', function(entry) {
        // Show Details
        showDetails(data.departureList[entry.itemIndex]);
      });
      
      // Show the new Menu
      resultsMenuDepartures.show();      
    },
    function(error) {
      // Failure!
      console.log('Failed fetching station data: ' + error);
    }
  );
   
}

function getDeparturesFromJSON(data) {
  var departures = [];
  //TODO: Fehlerbehandlung, wenn JSON-Antwort zurück kommt aber nicht auswertbar ist 
  //Beispiel: Tag in URL nur einstellig --> Fehlermeldung auf Uhr ausgeben!
  for(var i = 0; i < data.departureList.length; i++) {
    var number = data.departureList[i].servingLine.number;
    var direction = data.departureList[i].servingLine.direction;
    var countdown = data.departureList[i].countdown;    
    
    // Add to menu items array
    departures.push({
      title:number + ' (' + direction + ')',
      subtitle:'In ' + countdown + ' Minuten',
    });
  }
  // Finally return whole array
  return departures;
}


function showDetails(departure){
  // Show window with departure details
  var detailWindow = new UI.Window();
  var minute;
  
  if(departure.countdown == 1){
     minute = 'Minute';
  }else{
     minute = 'Minuten';
  }
  
  var header = new UI.Text({
    position: new Vector2(0, 0),
    size: new Vector2(144, 20),
    text:'Abfahrtsdetails:',
    font:'GOTHIC_24_BOLD',
    color:'black',
    textOverflow:'wrap',
    textAlign:'center',
    backgroundColor:'white'
  });
  
  
  var line = new UI.Text({
    position: new Vector2(0, 20),
    size: new Vector2(144, 80),
    text:departure.servingLine.number + ' (' + departure.servingLine.direction +  ')',
    font:'GOTHIC_24',
    color:'black',
    textOverflow:'wrap',
    textAlign:'center',
    backgroundColor:'white'
  });
  
   var timer = new UI.Text({
    position: new Vector2(0, 100),
    size: new Vector2(144, 168),
    text:'In ' + departure.countdown + ' ' + minute  ,
    font:'GOTHIC_24',
    color:'black',
    textOverflow:'wrap',
    textAlign:'center',
    backgroundColor:'white'
  });
  
  // Add to splashWindow and show
  detailWindow.add(header);
  detailWindow.add(line);
  detailWindow.add(timer);
  detailWindow.show();
}

navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);


