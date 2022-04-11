<?php
# This script converts raw JSON data from ICAO at https://www.icao.int/publications/DOC8643/ (Aircraft Type Designators) to format used in `/public_html/db/aircraft_types/icao_aircraft_types.json'

$json = file_get_contents("./raw-icao-db.json"); #Raw json path to file
$jsonOut = "./icao_aircraft_types.json"; #Output file

$rawArray = json_decode($json,true);
$outArray = [];

foreach ($rawArray as $field => $value) {
		#Basic data
		$outArray[$value['Designator']]['desc'] = $value['Description'];
		$outArray[$value['Designator']]['wtc'] = $value['WTC'];

		#Extended data
		/*
		$outArray[$value['Designator']]['n'] = $value['ModelFullName'];
		$outArray[$value['Designator']]['m'] = $value['ManufacturerCode'];
		$outArray[$value['Designator']]['ec'] = $value['EngineCount'];
		$outArray[$value['Designator']]['et'] = $value['EngineType'];
		*/
}

$arrJson = json_encode($outArray);
	$file = fopen($jsonOut,'w');
	if(fwrite($file, $arrJson) === false){
		print_r("<pre>".$jsonOut." > write failed.");
	} else {
		print_r("<pre>".$jsonOut." > saved successfully.</pre>");
	}
	fclose($file);

#echo '<pre>' . print_r($arrJson, true) . '</pre>';

 ?>
