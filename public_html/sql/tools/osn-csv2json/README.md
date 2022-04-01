Script converts opensky-network.org airctraft database (aircraftDatabase.csv) into a bunch of json files suitable for use by the dump1090 in order to recognize aircraft by ICAO24 code and display basic information. It was updated from python 2 to 3 and adjusted to use with [opensky-network.org airctraft database](https://opensky-network.org/datasets/metadata/).

### Instructions
Unlike the previous one, this script is selective - you have to specify which columns to process. It is also possible to map column names in the resulting JSON.
1. Download latest CSV from https://opensky-network.org/datasets/metadata/ an move csv file to scripts directory
2. Run script with python 3 with <path to CSV> and <path to JSON output> parameters e.g "osn-csvToJson.py aircraftDatabase-2022-03.csv ./db"

### Credits
 - This is based on ["csv-to-json.py"](https://github.com/alkissack/Dump1090-OpenLayers3-html/blob/master/public_html/sql/tools/create-new-database/csv-to-json.py) from Dump1090-OpenLayers3-html
 - [OpenSky's Aircraft Metadata Database](https://opensky-network.org/data/datasets)
