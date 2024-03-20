// let map = L.map('map').setView([54.805, -2.799], 6);
// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19,
//     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo(map);


// Define the Stadia Stamen Terrain tile layer with an API key.
// This creates a new tile layer using Stadia Maps' Stamen Terrain style. 
// The URL includes placeholders for coordinates ({z}, {x}, {y}) and a parameter for the API key.
var Stadia_StamenTerrainBackground = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png?api_key=326d8a1b-041f-44ad-aa58-fdfdce54c9ca', {
    minZoom: 0,    // The minimum zoom level at which this layer will be visible.
    maxZoom: 18,   // The maximum zoom level at which this layer will be visible.
    attribution: '...' // Attribution text displayed on the map, as required by the data providers.
});

// Create the map object and set its initial view.
// 'L.map' creates a new map instance, and 'setView' sets the initial geographic center and zoom level.
let map = L.map('map').setView([52.705, -2.099], 6.5);

// Add the Stadia Stamen Terrain layer to the map.
// This makes the Stadia Stamen Terrain layer visible on the map.
Stadia_StamenTerrainBackground.addTo(map);

// Initialize objects to store data about stations and rainfall.
let stationData = {};
let rainfallData = {};

// Function to fetch rainfall data for all stations.
// This function makes a network request to an API, processes the JSON response,
// and stores rainfall data keyed by station codes in 'rainfallData'.
function fetchAllRainfallData() {
    return fetch('https://environment.data.gov.uk/flood-monitoring/id/measures?parameter=rainfall')
        .then(response => response.json())
        .then(data => {
            let totalRainfall = 0; // Variable to store total rainfall
            let stationsWithRain = 0; // Variable to count stations with more than 0 mm rain

            if (data.items) {
                data.items.forEach(measurement => {
                    if (measurement.latestReading) {
                        let stationCode = measurement.stationReference;
                        let rainfallValue = measurement.latestReading.value;
                        rainfallData[stationCode] = rainfallValue;
                        totalRainfall += rainfallValue; // Add to total rainfall
                        if (rainfallValue > 0) {
                            stationsWithRain++; // Count stations with rain
                        }
                    }
                });
            }

            displayTotalRainfall(totalRainfall); // Display the total rainfall on the map
            displayStationsWithRain(stationsWithRain); // Display the number of stations with rain
        })
        .catch(error => console.error("FETCH ERROR:", error));
}


// Function to fetch the latest locations of the UK Environment Agency stations and update our map.
// This function retrieves station data and then calls 'updateStationsOnMap' to add markers to the map.
function getUKStations() {
    return fetch('https://environment.data.gov.uk/flood-monitoring/id/stations?parameter=rainfall')
        .then(response => response.json())
        .then(data => {
            if (data.items) {
                updateStationsOnMap(data.items, 'blue', 1000); // Process up to 1000 stations.
            }
        })
        .catch(error => console.error("FETCH ERROR:", error));
}

// Function to determine the circle radius based on rainfall amount.
// This function calculates the radius of a circle marker based on the amount of rainfall,
// using a base radius for zero rainfall and increasing the radius for higher rainfall amounts.
function getCircleRadius(rainfallAmount) {
    const baseRadius = 1150; // Base radius for circles representing 0 mm rainfall
    if (rainfallAmount > 0) {
        return baseRadius + rainfallAmount * 13000; // Increase radius based on rainfall
    }
    return baseRadius; // Return base radius for 0 mm rainfall
}

function createSvgGradient(id, innerColor, outerColor) {
    var svgNS = "http://www.w3.org/2000/svg";
    var grad = document.createElementNS(svgNS, 'radialGradient');
    grad.setAttribute('id', id);

    var start = document.createElementNS(svgNS, 'stop');
    start.setAttribute('offset', '10%');
    start.setAttribute('stop-color', innerColor);

    var end = document.createElementNS(svgNS, 'stop');
    end.setAttribute('offset', '100%');
    end.setAttribute('stop-color', outerColor);

    grad.appendChild(start);
    grad.appendChild(end);

    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.appendChild(grad);

    document.body.appendChild(svg);

    return 'url(#' + id + ')';
}

// function displayTotalRainfall(totalRainfall) {
//     var info = L.control();

//     info.onAdd = function (map) {
//         this._div = L.DomUtil.create('div', 'info'); // Create a div with a class "info"
//         this.update();
//         return this._div;
//     };

//     // Method to update the control based on feature properties passed
//     info.update = function () {
//         this._div.innerHTML = '<h4>Total Rainfall</h4>' + totalRainfall.toFixed(2) + ' mm';
//     };

//     info.addTo(map);
// }

function displayTotalRainfall(totalRainfall) {
    console.log("Total Rainfall: ", totalRainfall); // Log the total rainfall
    document.getElementById('rainfall-value').innerText = totalRainfall.toFixed(2);
}


function updateStationsOnMap(stations, color, limit) {
    stations.forEach((station, index) => {
        if (index < limit) {
            const stationLat = station.lat || station.station_latitude;
            const stationLng = station.long || station.station_longitude;
            const stationCode = station.notation;

            if (stationLat && stationLng) {
                let rainfallAmount = rainfallData.hasOwnProperty(stationCode) ? rainfallData[stationCode] : 0;
                let circleRadius = getCircleRadius(rainfallAmount);
                
                // Adjust the circle style based on the rainfall amount
                let circleStyle = {};
                if (rainfallAmount > 0) {
                    // For non-zero rainfall, use a gradient
                    circleStyle = {
                        color: 'transparent', // This removes the bluish edge
                        fillColor: getGradientFillColor(color),
                        fillOpacity: 0.9,
                        weight: 0,
                        radius: circleRadius,
                    };
                } else {
                    // For zero rainfall, use a simple fill
                    circleStyle = {
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.4,
                        weight: 0,
                        radius: circleRadius,
                    };
                }

                // Create a circle marker with the specified style
                let circle = L.circle([stationLat, stationLng], circleStyle);

                let popupContent = "Station: " + stationCode + "<br>Rainfall: " + rainfallAmount + " mm";
                circle.bindPopup(popupContent);

                circle.addTo(map);
                stationData[stationCode] = { marker: circle };
            }
        }
    });
}

function getGradientFillColor(baseColor) {
    // Create a unique ID for the gradient
    var gradientId = 'gradient-' + baseColor.replace('#', '');
    var gradientUrl = createSvgGradient(gradientId, baseColor, 'transparent'); // Gradient from baseColor to white
    return gradientUrl;
}

// function displayStationsWithRain(stationsWithRain) {
//     var info = L.control({position: 'bottomright'}); // Position the control at the bottom right

//     info.onAdd = function (map) {
//         this._div = L.DomUtil.create('div', 'info'); // Create a div with a class "info"
//         this.update();
//         return this._div;
//     };

//     // Update the control based on feature properties passed
//     info.update = function () {
//         this._div.innerHTML = '<h4>Stations with Rain</h4>' + stationsWithRain + ' stations';
//     };

//     info.addTo(map);
// }

function displayStationsWithRain(stationsWithRain) {
    console.log("Stations with Rain: ", stationsWithRain); // Log the number of stations
    document.getElementById('stations-value').innerText = stationsWithRain;
}


// The rest of the createSvgGradient function remains the same

// Sequentially fetch rainfall data and then station details.
// First, it fetches all rainfall data, and once that's complete,
// it proceeds to fetch and process station data.
fetchAllRainfallData().then(() => {
    getUKStations();
});