<!--
	// Import and combine JSON aircraft DB to one mysql table (aircraft_icao24.sql) from multiple sources.
	// First change $jsonFilesPath to original db directory an run the script. After complition change $jsonFilesPath do antoher json db dir and run script again.
	// Script loads in sequence all json files from given direcory and write each aircraft data based on ICAO24 and its values as row in db. If ICAO24 is alredy in DB, empty values are overwritten with new data (if data exist).
	// Script executes very long depending on cpu and volume of json files, it is better to change max_execution_time in php.ini
	// (probably it would be wiser to make it ajax calls individually for each file or dont use php at all)
-->
<html>
	<style>
		pre {
		display: block;
		font-family: monospace;
		white-space: pre;
		margin: 2px 0px;
		font-size: 12px;
		}
	</style>
	<script>
		var active = true;
		document.addEventListener("click", function (evt) {	active = false;	});
		var scroller = setInterval(function() { if (active){window.scrollTo(0,document.body.scrollHeight)} else {return;}}, 10);
	</script>
	<?php //php7.4

	###CONFIG
	$jsonFilesPath = './temp/db1/'; 	#change path to dir with JSON database
	$displayLog = true; 							#set printing log to false in order to improve performance a bit

		include('./dbconf.inc.php');
		set_time_limit(0);
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
		$starttime = microtime(true);

		$columns = ['country', 'image', 'interesting', 'op', 'owner', 'short', 'trail', 'type', 'airforce', 't', 'r',
		'operatoricao', 'operatorcallsign', 'built', 'm', 'icaoaircrafttype', 'serialnumber', 'registered', 'engines', 'categoryDescription', 'notes' ];
		$counter = 0;
		$con = new mysqli($servername, $username, $password, $dbname);
		if ($con->connect_error) { die("Connection failed: " . $con->connect_error);	} else {echo "<pre>Db connected</pre>";}

		//search for json files in given dir, open and put in array
		$jsonFiles = glob($jsonFilesPath.'*.{json}', GLOB_BRACE);
		foreach($jsonFiles as $jsonFile) {
			echo ('<h2>OPENING: '.$jsonFile.'</h2>');
			$icaoIndex = pathinfo($jsonFile)['filename'];
			$jsondata = file_get_contents($jsonFile);
			$data = json_decode($jsondata, true);
			array_walk_recursive($data, "specCharsFilter");

			writeDb($data, $icaoIndex); //send array to write DB function
		}

		function specCharsFilter(&$value) {
		  $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
		}

		function checkNull ($icao24, $field, $value) {
			global $con;
			global $aircraftTable;

			$checkNull = mysqli_query($con,"SELECT $field FROM $aircraftTable WHERE icao24='$icao24' ");

			if($checkNull->lengths == NULL || $checkNull == "" || $checkNull != 0 && $value != "") {
			return true; } else {return false;}

		}

		function writeDb($data, $icaoIndex) {
			global $con;
			global $aircraftTable;
			global $columns;
			global $counter;
			global $displayLog;

			foreach ($data as $row => $payload) {
				if ($row != "children") {
					$icao24 = strval($icaoIndex).$row;
					$ac['country'] = isset($payload['Country'])? $payload['Country'] : null;

					if (isset($payload['Image']) && $payload['Image'] !== "Missing") { $ac['image']  = $payload['Image']; }
					else { $ac['image'] = null; };

					$ac['interesting'] = isset($payload['Int'])? $payload['Int'] : 0;
					$ac['op'] = isset($payload['Op'])? $payload['Op'] : null;
					$ac['owner'] = isset($payload['Owner'])? $payload['Owner'] : null;
					$ac['short'] = isset($payload['Short'])? $payload['Short'] : null;
					$ac['trail'] = isset($payload['Trail'])? $payload['Trail'] : 0;
					$ac['type'] = isset($payload['Type'])? $payload['Type'] : null;
					$ac['airforce'] = isset($payload['Force'])? $payload['Force'] : null;
					$ac['t'] = isset($payload['t'])? $payload['t'] : null;
					$ac['r'] = isset($payload['r'])? $payload['r'] : null;

					$ac['operatoricao'] = isset($payload['operatoricao'])? $payload['operatoricao'] : null;
					$ac['operatorcallsign'] = isset($payload['operatorcallsign'])? $payload['operatorcallsign'] : null;
					$ac['built'] = isset($payload['built'])? intval(substr($payload['built'], 0, 4)) : 0;
					$ac['m'] = isset($payload['m'])? $payload['m'] : null;
					$ac['icaoaircrafttype'] = isset($payload['icaoaircrafttype'])? $payload['icaoaircrafttype'] : null;
					$ac['serialnumber'] = isset($payload['serialnumber'])? $payload['serialnumber'] : null;
					$ac['registered'] = isset($payload['registered'])? $payload['registered'] : null;
					$ac['engines'] = isset($payload['engines'])? $payload['engines'] : null;
					$ac['categoryDescription'] = isset($payload['categoryDescription'])? $payload['categoryDescription'] : null;
					$ac['notes'] = isset($payload['notes'])? $payload['notes'] : null;

					//array_walk_recursive( $ac, 'json_encode' );

					$checkIcao24 = mysqli_query($con, "SELECT * FROM `$aircraftTable` WHERE icao24='$icao24'") or die(mysqli_error());
					$rowCheck = mysqli_num_rows($checkIcao24);

					$psAcAdd = $con->prepare("INSERT INTO $aircraftTable(icao24, country, image, interesting, op, owner, short, trail, type, airforce, t, r, operatoricao, operatorcallsign, built, m, icaoaircrafttype, serialnumber, registered, engines, categoryDescription, notes ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");



					if($rowCheck !== 0) {
						foreach ($columns as $column) {
							if($ac[$column] != null || $ac[$column] != "" && checkNull($icao24, $column, $ac[$column])  ) {

								$sqlSafeVal = mysqli_real_escape_string($con, $ac[$column]);

								$psAcUpdate = $con->prepare("UPDATE $aircraftTable SET $column=? WHERE icao24=?");
								$psAcUpdate->bind_param('ss', $sqlSafeVal, $icao24);
								$psAcUpdate->execute();

								//for debugging troublesome values (DOM heavy!)
								//if(!$sql)	{	echo mysqli_error($con), E_USER_ERROR;} else {	echo ('<pre>UPDATED: ('.$counter++.'): '.$icao24.' | '. $ac[$column] .'</pre>');}
							}
						}
							if(!$psAcUpdate)	{	echo mysqli_error($con), E_USER_ERROR;} else { if($displayLog){	echo ('<pre>UPDATED: ('.$counter++.'): '.$icao24.'</pre>');}}
						}	else { #AC dont exist add new row and populate with data

						$psAcAdd->bind_param("sssisssissssssisssssss",
						$icao24,
						$ac["country"],
						$ac["image"],
						$ac["interesting"],
						$ac["op"],
						$ac["owner"],
						$ac["short"],
						$ac["trail"],
						$ac["type"],
						$ac["airforce"],
						$ac["t"],
						$ac["r"],
						$ac["operatoricao"],
						$ac["operatorcallsign"],
						$ac["built"],
						$ac["m"],
						$ac["icaoaircrafttype"],
						$ac["serialnumber"],
						$ac["registered"],
						$ac["engines"],
						$ac["categoryDescription"],
						$ac["notes"]);
						$psAcAdd->execute();

						if(!$psAcAdd)	{	echo mysqli_error($con);}	else {	if($displayLog){	echo ('<pre>ADDED ('.$counter++.'): '.$icao24.'</pre>');}}
					}

					flush();
					ob_flush();
				}

				if ($row === array_key_last($data)) {
					{	echo ('<h4>DONE: '.$icaoIndex.'.json</h4>'); 	}
				}
			}
		}

		//for optimization/benchmark purposes
		$endtime = microtime(true);
		printf("<pre>Script execution: %f seconds</pre>", $endtime - $starttime );
	?>
	<script>
		clearInterval(scroller);
	</script>
</html>
