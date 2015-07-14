var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');


// Show splash screen while waiting for data
var splashWindow = new UI.Window();

var splashPic = new UI.Image({
    position: new Vector2(0, 0),
    size: new Vector2(144, 121),
    image: 'images/splash.png'
});

// Text element to inform user
var GPStext = new UI.Text({
    position: new Vector2(0, 121),
    size: new Vector2(144, 47),
    text: 'Suche GPS-Position...',
    font: 'GOTHIC_18',
    color: 'black',
    textOverflow: 'wrap',
    textAlign: 'center',
    backgroundColor: 'white'
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
        text: 'Kein GPS-Signal. Standort- Einstellungen prüfen & mit Auswahlknopf erneut versuchen.',
        font: 'GOTHIC_24_BOLD',
        color: 'black',
        textOverflow: 'wrap',
        textAlign: 'center',
        backgroundColor: 'white'
    });
    splashWindow.add(errorText);
    splashWindow.on('click', 'select', function(){
      splashWindow.remove(errorText);
      splashWindow.add(GPStext);
      splashWindow.add(splashPic);
      navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
      });
}

function vrrCoordRequest(lat, lon) {
    //build URL
    var URL = 'http://app.vrr.de/standard/XML_COORD_REQUEST?outputFormat=JSON&coordOutputFormat=WGS84&' +
        'coord=' + lon + ':' + lat + ':WGS84&max=10&inclFilter=1&radius_1=1000&type_1=STOP';

    //var URL = 'http://app.vrr.de/standard/XML_COORD_REQUEST?outputFormat=JSON&coordOutputFormat=WGS84&' + 
    //        'coord=' + '6.767' + ':' + '51.5' + ':WGS84&max=10&inclFilter=1&radius_1=1000&type_1=STOP';
    // Leere Antwort 9.75:52.4
    // Make the request
    ajax({
            url: URL,
            type: 'json'
        },
        function(data) {
            // Success!
            console.log('Successfully fetched stations for coords!');
            console.log('URL: ' + URL);
            var menuItems = getStationsFromJSON(data);

            if (menuItems !== null) {
                console.log('showing menuItems');
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
            }
        },
        function(error) {
            // Failure!
            console.log('Failed fetching station data: ' + error);
        }
    );
}

function getStationsFromJSON(data) {
    var items = [];
    try {
        for (var i = 0; i < data.pins.length; i++) {
            var station = data.pins[i].desc;
            var distance = data.pins[i].distance + 'm entfernt';

            // Add to menu items array
            items.push({
                title: station,
                subtitle: distance,
            });
        }
    } catch (e) {
        showError();
        console.log('Error while parsing data: ' + e);
        return null;
    }
    // Finally return whole array
    return items;
}

function vrrStationRequest(stationID, stationName) {

    //Datum und Uhrzeit bestimmen  
    var jetzt = new Date();
    var jahr = jetzt.getFullYear();
    var monat = jetzt.getMonth();
    monat = monat + 1;
    if (monat < 10) {
        monat = '0' + monat;
    }
    var tag = jetzt.getDate();
    if (tag < 10) {
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
    ajax({
            url: stationURL,
            type: 'json'
        },
        function(data) {
            // Success!
            console.log('Response received! Trying to parse data...');

            var menuItemsDepartures = getDeparturesFromJSON(data);
            if (menuItemsDepartures !== null) {
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
            }
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
    try {
        for (var i = 0; i < data.departureList.length; i++) {
            var number = data.departureList[i].servingLine.number;
            var direction = data.departureList[i].servingLine.direction;
            var countdown = data.departureList[i].countdown;

            // Add to menu items array
            departures.push({
                title: number + ' (' + direction + ')',
                subtitle: 'In ' + countdown + ' Minuten',
            });
        }
    } catch (e) {
        showError();
        console.log('Error while parsing data: ' + e);
        return null;
    }
    // Finally return whole array
    return departures;
}


function showDetails(departure) {
    // Show window with departure details
    var detailWindow = new UI.Window();
    var minute;
    var platform;

    if (departure.countdown == 1) {
        minute = 'Minute';
    } else {
        minute = 'Minuten';
    }

    if (departure.platform === '') {
        platform = 1;
    } else {
        platform = departure.platform;
    }


    var background = new UI.Rect({
        position: new Vector2(0, 0),
        size: new Vector2(144, 168),
        backgroundColor: 'black',
        borderColor: 'black'
    });

    var background2 = new UI.Rect({
        position: new Vector2(0, 49),
        size: new Vector2(144, 77),
        backgroundColor: 'white',
        borderColor: 'white'
    });

    var header = new UI.Text({
        position: new Vector2(0, 0),
        size: new Vector2(144, 48),
        text: 'Abfahrtsdetails \n Linie ' + departure.servingLine.number,
        font: 'GOTHIC_24_BOLD',
        color: 'white',
        textOverflow: 'wrap',
        textAlign: 'center',
        backgroundColor: 'black'
    });

    var direction1 = new UI.Text({
        position: new Vector2(5, 48),
        size: new Vector2(139, 27),
        text: 'Richtung ',
        font: 'GOTHIC_24_BOLD',
        color: 'black',
        textOverflow: 'fill',
        textAlign: 'left',
        backgroundColor: 'white'
    });

    var direction2 = new UI.Text({
        position: new Vector2(5, 72),
        size: new Vector2(139, 27),
        text: departure.servingLine.direction,
        font: 'GOTHIC_24',
        color: 'black',
        textOverflow: 'fill',
        textAlign: 'left',
        backgroundColor: 'white'
    });


    var platform1 = new UI.Text({
        position: new Vector2(5, 97),
        size: new Vector2(75, 27),
        text: 'Bahnsteig ',
        font: 'GOTHIC_24_BOLD',
        color: 'black',
        textOverflow: 'wrap',
        textAlign: 'left',
        backgroundColor: 'white'
    });

    var platform2 = new UI.Text({
        position: new Vector2(83, 97),
        size: new Vector2(61, 27),
        text: platform,
        font: 'GOTHIC_24',
        color: 'black',
        textOverflow: 'wrap',
        textAlign: 'left',
        backgroundColor: 'white'
    });

    var timer = new UI.Text({
        position: new Vector2(0, 125),
        size: new Vector2(144, 40),
        text: 'In ' + departure.countdown + ' ' + minute,
        font: 'GOTHIC_24_BOLD',
        color: 'white',
        textOverflow: 'wrap',
        textAlign: 'center',
        backgroundColor: 'black'
    });

    var borderBottom = new UI.Rect({
        position: new Vector2(0, 125),
        size: new Vector2(144, 3),
        borderColor: 'white'
    });

    var borderTop = new UI.Rect({
        position: new Vector2(0, 48),
        size: new Vector2(144, 3),
        borderColor: 'black',
        backgroundColor: 'black'
    });

    // Add Elements and show Window
    detailWindow.add(background);
    detailWindow.add(background2);
    detailWindow.add(timer);
    detailWindow.add(platform2);
    detailWindow.add(platform1);
    detailWindow.add(direction2);
    detailWindow.add(direction1);
    detailWindow.add(header);

    detailWindow.add(borderTop);
    detailWindow.add(borderBottom);

    detailWindow.show();
}

function showError() {
    var errorWindow = new UI.Window();
    var errorText = new UI.Text({
        position: new Vector2(0, 0),
        size: new Vector2(144, 168),
        text: 'Fehler beim Abrufen der Daten.\n Bitte erneut probieren oder Fehler melden!',
        font: 'GOTHIC_24_BOLD',
        color: 'black',
        textOverflow: 'wrap',
        textAlign: 'center',
        backgroundColor: 'white'
    });

    errorWindow.add(errorText);
    errorWindow.show();
}

navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);