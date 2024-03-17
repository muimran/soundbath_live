var Stadia_StamenTerrainBackground = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png?api_key=326d8a1b-041f-44ad-aa58-fdfdce54c9ca', {
    minZoom: 0,
    maxZoom: 18,
    attribution: 'Map data © OpenStreetMap contributors, CC-BY-SA, Imagery © Stadia Maps'
});
let map = L.map('map').setView([52.705, -2.099], 6.5);
Stadia_StamenTerrainBackground.addTo(map);

// Function to determine the circle radius based on rainfall amount
function getCircleRadius(rainfallAmount) {
    const baseRadius = 1150;
    return rainfallAmount > 0 ? baseRadius + rainfallAmount * 3000 : baseRadius;
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

function getGradientFillColor(baseColor) {
    var gradientId = 'gradient-' + baseColor.replace('#', '');
    return createSvgGradient(gradientId, baseColor, 'transparent');
}

function loadAndProcessCSV() {
    Papa.parse('eng_wales.csv', {
        download: true,
        header: true,
        complete: function(results) {
            let totalRainfall = 0;
            let stationsWithRain = 0;

            results.data.forEach(row => {
                const lat = parseFloat(row.lat);
                const lng = parseFloat(row.long);
                const rainfallAmount = parseFloat(row.rainfall_mm);

                if (!isNaN(lat) && !isNaN(lng) && !isNaN(rainfallAmount)) {
                    totalRainfall += rainfallAmount;
                    if (rainfallAmount > 0) stationsWithRain++;

                    let circleStyle = rainfallAmount > 0 ? {
                        color: 'transparent',
                        fillColor: getGradientFillColor('blue'),
                        fillOpacity: 0.9,
                        weight: 0,
                        radius: getCircleRadius(rainfallAmount)
                    } : {
                        color: 'blue',
                        fillColor: 'blue',
                        fillOpacity: 0.4,
                        weight: 0,
                        radius: getCircleRadius(0)
                    };

                    L.circle([lat, lng], circleStyle)
                      .bindPopup("Rainfall: " + rainfallAmount + " mm")
                      .addTo(map);
                }
            });

            console.log("Total Rainfall: ", totalRainfall.toFixed(2));
            console.log("Stations with Rain: ", stationsWithRain);
        }
    });
}

loadAndProcessCSV();
