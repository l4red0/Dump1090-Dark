## Aircraft JSON and MySQL tools
This set of tools could be helpful to merge multiple JSON aircraft databases (like inculded in /public_html/db/) and combine them to one. Brief description below. Detailed instructions are at the top of each file.
All scripts were run and tested in PHP 7.4, mySQL 5.7.24 and Ptyhon 3.10. The tools were successfully able to process over 500k records, for both import and export. Keep in mind, however, that PHP is the trade-off between speed and ease of use/stack needed. MySQL table itself is also flat for simplicity but could be easily transformed to relational one. Tools are NOT intended to run on RPi.

### Files

- `aircraft_icao24.sql` table structure for aircraft data. Must be imported to mySQL before using other tools.
- `dbconf.inc.php` db configuration file.
- `jsonDB-to-mysql.php` can convert json files with aircraft data from multiple sources to mySQL table.
- `csvToJson.py` converts CSV to JSON chunks that you can copy and overwrite to ./public_html/db/

### Instructions
1. Create new DB/table from `aircraft_icao24.sql`
2. Edit `dbconf.inc.php` in order to connect to DB
3. Run `jsonDB-to-mysql.php` to populate data into mySQL
4. Export mySQL table to CSV. If using phpMyAdmin:
   - Select 'export method' to custom
	 - Format to CSV
	 - Replace NULL with: "" (make this field empty)
	 - And check 'Put columns names in the first row' option
5. Run `csvToJson.py` to generate JSON DB static files from CSV obtained in point 4
