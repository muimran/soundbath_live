import requests
import csv
from opencage.geocoder import OpenCageGeocode
import time
from datetime import datetime


# Function to fetch station data with coordinates for England
def fetch_station_data_eng():
    url = 'https://environment.data.gov.uk/flood-monitoring/id/stations?parameter=rainfall'
    response = requests.get(url)
    eng_station_data = {}
    if response.status_code == 200:
        data = response.json()
        for station in data['items']:
            if station.get('lat') is not None and station.get('long') is not None:
                eng_station_data[station.get('notation')] = {
                    'latitude': station.get('lat'),
                    'longitude': station.get('long')
                }
    return eng_station_data

# Function to fetch rainfall measurements for England
def get_rainfall_data_eng():
    eng_url = "http://environment.data.gov.uk/flood-monitoring/id/measures?parameter=rainfall"
    eng_response = requests.get(eng_url)
    if eng_response.status_code == 200:
        eng_data = eng_response.json()
        return eng_data['items']
    return []

# Function to fetch station data with coordinates for Scotland
def fetch_station_data_sco():
    sco_url = "https://www2.sepa.org.uk/rainfall/api/Stations"
    sco_response = requests.get(sco_url)
    sco_station_data = {}
    if sco_response.status_code == 200:
        sco_stations = sco_response.json()
        for station in sco_stations:
            if station.get('station_latitude') is not None and station.get('station_longitude') is not None:
                sco_station_data[station['station_no']] = {
                    'latitude': station.get('station_latitude'),
                    'longitude': station.get('station_longitude')
                }
    return sco_station_data



# Fetching and processing data for England, Scotland, and Wales
eng_station_coordinates = fetch_station_data_eng()
eng_rainfall_data = get_rainfall_data_eng()
wales_rainfall_data = get_wales_rainfall_data('413a14f470f64b70a010cfa3b4ed6a79')  # Replace with the actual API key for Natural Resources Wales

# Combine the data
combined_data = []

# Process and combine England data
for measurement in eng_rainfall_data:
    station_id = measurement.get('stationReference')
    rainfall = measurement.get('latestReading', {}).get('value')
    coordinates = eng_station_coordinates.get(station_id, {'latitude': None, 'longitude': None})
    if coordinates['latitude'] is not None and coordinates['longitude'] is not None:
        combined_data.append([station_id, rainfall, coordinates['latitude'], coordinates['longitude'], 'England'])


# Process and combine Wales data
for station_data in wales_rainfall_data:
    station_id = station_data['station_id']
    rainfall = station_data['rainfall']
    latitude = station_data['latitude']
    longitude = station_data['longitude']
    if latitude is not None and longitude is not None:
        combined_data.append([station_id, rainfall, latitude, longitude, 'Wales'])

# Update existing CSV with rainfall data
filename = "eng_wales.csv"
with open(filename, mode='r', newline='', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    existing_data = list(reader)

# Create a mapping of station ID to index in existing data
station_id_to_index = {row['station_id']: index for index, row in enumerate(existing_data)}

# Update the rainfall_mm column
for data_row in combined_data:
    station_id = data_row[0]
    rainfall = data_row[1]
    if station_id in station_id_to_index and rainfall is not None:
        existing_data[station_id_to_index[station_id]]['rainfall_mm'] = rainfall

# Write the updated data back to the CSV
with open(filename, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.DictWriter(file, fieldnames=reader.fieldnames)
    writer.writeheader()
    writer.writerows(existing_data)

# Now calculate and update the county_avg
# Calculate county rainfall totals and counts
county_rainfall = {}
for row in existing_data:
    county = row['county']
    rainfall = float(row['rainfall_mm']) if row['rainfall_mm'] else 0
    if county not in county_rainfall:
        county_rainfall[county] = {'total_rainfall': 0, 'count': 0}
    county_rainfall[county]['total_rainfall'] += rainfall
    county_rainfall[county]['count'] += 1

# Calculate averages and update the county_avg column
for county, data in county_rainfall.items():
    data['average_rainfall'] = "{:.2f}".format(data['total_rainfall'] / data['count']) if data['count'] > 0 else "0.00"

for row in existing_data:
    county = row['county']
    row['county_avg'] = county_rainfall[county]['average_rainfall']

# Write the final updated data back to the CSV
with open(filename, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.DictWriter(file, fieldnames=reader.fieldnames)
    writer.writeheader()
    writer.writerows(existing_data)

current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
print(f"Data has been updated in {filename} and current time is {current_time}")