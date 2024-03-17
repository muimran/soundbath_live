import requests
import csv
from datetime import datetime

# Function to fetch station data with coordinates for England
def fetch_station_data_eng():
    url = 'https://environment.data.gov.uk/flood-monitoring/id/stations?parameter=rainfall'
    response = requests.get(url)
    eng_station_data = {}
    if response.status_code == 200:
        data = response.json()
        for station in data['items']:
            if station.get('latitude') is not None and station.get('longitude') is not None:
                eng_station_data[station.get('notation')] = {
                    'latitude': station.get('longitude'),
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

# Function to fetch station data with rainfall measurements for Wales
def get_wales_rainfall_data(api_key):
    url = 'https://api.naturalresources.wales/rivers-and-seas/v1/api/StationData'
    headers = {'Ocp-Apim-Subscription-Key': api_key}
    response = requests.get(url, headers=headers)
    wales_rainfall_data = []
    if response.status_code == 200:
        wales_data = response.json()
        for station in wales_data:
            if station['coordinates']['latitude'] is not None and station['coordinates']['longitude'] is not None:
                station_id = station['location']
                latitude = station['coordinates']['latitude']
                longitude = station['coordinates']['longitude']
                rainfall = None
                for parameter in station['parameters']:
                    if parameter['paramNameEN'] == 'Rainfall':
                        rainfall = parameter['latestValue']
                        break
                if rainfall is not None:
                    wales_rainfall_data.append({
                        'station_id': station_id,
                        'rainfall': rainfall,
                        'latitude': latitude,
                        'longitude': longitude
                    })
    return wales_rainfall_data

# Fetching and processing data for England, Scotland, and Wales
eng_station_coordinates = fetch_station_data_eng()

# # Print first 10 lines of England station data
# print("First 10 lines of England station data:")
# for i, (station_id, station_info) in enumerate(eng_station_coordinates.items()):
#     if i < 10:
#         print(f"Station ID: {station_id}, Coordinates: {station_info}")
# print()

eng_rainfall_data = get_rainfall_data_eng()

# # Print first 10 lines of England rainfall data
# print("First 10 lines of England rainfall data:")
# for i, measurement in enumerate(eng_rainfall_data[:10]):
#     print(f"Measurement {i+1}: {measurement}")
# print()

wales_rainfall_data = get_wales_rainfall_data('413a14f470f64b70a010cfa3b4ed6a79')

# # Print first 10 lines of Wales rainfall data
# print("First 10 lines of Wales rainfall data:")
# for i, station_data in enumerate(wales_rainfall_data[:10]):
#     print(f"Station ID: {station_data['station_id']}, Rainfall: {station_data['rainfall']} mm")
# print()


# Combine the data using latitude and longitude as the key
combined_data = []

# Process and combine England data
for measurement in eng_rainfall_data:
    station_id = measurement.get('stationReference')
    rainfall = measurement.get('latestReading', {}).get('value')
    coordinates = eng_station_coordinates.get(station_id, {'latitude': None, 'longitude': None})
    lat_long_key = (coordinates['latitude'], coordinates['longitude'])
    if coordinates['latitude'] is not None and coordinates['longitude'] is not None:
        combined_data.append([lat_long_key, rainfall, 'England'])

# Process and combine Wales data
for station_data in wales_rainfall_data:
    rainfall = station_data['rainfall']
    latitude = station_data['latitude']
    longitude = station_data['longitude']
    lat_long_key = (latitude, longitude)
    if latitude is not None and longitude is not None:
        combined_data.append([lat_long_key, rainfall, 'Wales'])

# Update existing CSV with rainfall data
filename = "eng_wales.csv"
with open(filename, mode='r', newline='', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    existing_data = list(reader)

# Create a mapping of latitude and longitude to index in existing data
lat_long_to_index = {(float(row['lat']), float(row['long'])): index for index, row in enumerate(existing_data)}

# Update the rainfall_mm column
for data_row in combined_data:
    lat_long_key = data_row[0]
    rainfall = data_row[1]
    if lat_long_key in lat_long_to_index and rainfall is not None:
        existing_data[lat_long_to_index[lat_long_key]]['rainfall_mm'] = rainfall



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
