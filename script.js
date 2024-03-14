
let map = L.map('map').setView([-4.880576, 54.336061], 4);



// Initialize objects to store data about stations and rainfall.
let stationData = {};
let rainfallData = {};

// Function to fetch rainfall data for all stations and store data keyed by station codes in 'rainfallData'.
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

// Function to retrieve station data and then call 'updateStationsOnMap' to add markers to the map.
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
                
                var el = document.createElement('div');
                el.className = 'marker';
                el.style.background = color;
                el.style.width = circleRadius * 2 + 'px';
                el.style.height = circleRadius * 2 + 'px';

                new mapboxgl.Marker(el)
                    .setLngLat([stationLng, stationLat])
                    .setPopup(new mapboxgl.Popup().setHTML("Station: " + stationCode + "<br>Rainfall: " + rainfallAmount + " mm"))
                    .addTo(map);
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


function displayStationsWithRain(stationsWithRain) {
    console.log("Stations with Rain: ", stationsWithRain); // Log the number of stations
    document.getElementById('stations-value').innerText = stationsWithRain;
}


fetchAllRainfallData().then(() => {
    getUKStations();
});
