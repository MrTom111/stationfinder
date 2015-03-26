/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */


var UI = require('ui');
var ajax = require('ajax');

// Create a Card with title and subtitle
var card = new UI.Card({
  title:'Haltestellen',
  subtitle:'Suche...'
});

// Display the Card
card.show();

// Construct URL
var datum = '20150325';
var zeit = '1900';
var stationID = '20018250';
var URL = 'http://app.vrr.de/standard/XSLT_DM_REQUEST?outputFormat=JSON&language=de&stateless=1&coordOutputFormat=WGS84&' + 
'type_dm=stop&name_dm=' + stationID + '&itdDate=' + datum + '&itdTime=' + zeit + '&useRealtime=1&mode=direct&' +
'ptOptionsActive=1&deleteAssignedStops_dm=1&mergeDep=1&limit=10';

// Make the request
ajax(
  {
    url: URL,
    type: 'json'
  },
  function(data) {
    // Success!
    console.log('Successfully fetched station data!');

    // Extract data
    var station = data.dm.points.point.name;
    var line = data.servingLines.lines[0].mode.number;

    // Always upper-case first letter of description
    var destination = data.servingLines.lines[0].mode.destination;
    destination = destination.charAt(0).toUpperCase() + destination.substring(1);
    
    // Show to user
    card.subtitle(station + ', ' + line);
    card.body('Richtung: ' + destination);
  },
  function(error) {
    // Failure!
    console.log('Failed fetching station data: ' + error);
  }
);

