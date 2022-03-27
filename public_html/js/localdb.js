$.getScript("/js/dexie-export-import.min.js", function() {
	console.log("dexie-export-import.min.js loaded");
});
$.getScript("/js/download.min.js", function() {
	console.log("download.min.js loaded");
});

var locDb = new Dexie("db1090");

locDb.version(1.1).stores({
	aircraft: "++id,&icao,[lastSeen+firstSeen],*flight, sightCount",
	signalStrenght: "++id,&sector,*alt,*rssi"
});

async function dbAircraftRegister(planeIcao, flight) {
	var exist = false;
	var currentTime = Date.now();
	var newSightCount;

	if (flight !== null) {
		trimFlight = flight;
		var flight = trimFlight.trim();
	} else {
		var flight = null;
	}

	if ((planeIcao).lenght != 6 || planeIcao == null || planeIcao == "") {
		planeIcao == '000000';
	}

	locDb.aircraft.where('icao').equals(planeIcao).count(function(count) {
		count == 0 ? exist = false : exist = true
	}).then(function() {
		if (!exist) {
			locDb.aircraft.add({
				icao: planeIcao,
				flight: flight,
				firstSeen: currentTime,
				sightCount: 1
			});
			console.log('new AC added: ' + planeIcao);
		} else {

			locDb.aircraft.get({
				'icao': planeIcao
			}).then(function(aircraftData) {
				if (Date.now() > aircraftData.lastSeen + (1000 * 60 * 60)) {
					newSightCount = aircraftData.sightCount + 1;
					console.log('seen more than hour ago ' + aircraftData.icao);
				} else if (aircraftData.sightCount == null) {
					newSightCount = 1;
				} else {
					newSightCount = aircraftData.sightCount;
					//console.log('alredy seen ' + newSightCount + aircraftData.sightCount);
				}

			}).then(function() {
				locDb.aircraft.where('icao').equals(planeIcao).modify({
					lastSeen: currentTime,
					flight: flight,
					sightCount: newSightCount
				});
			});
			//console.log('update: ' + planeIcao);
		}
	});
}


//exporting dexie DB
async function dbExport() {

	//	document.addEventListener('DOMContentLoaded', () => {
	console.log('export initiated');

	//showContent().catch(err => console.error('' + err));
	const exportLink = document.getElementById('exportLink');


	async function blogGenerate(){
		try {
			const blob = await locDb.export({
				prettyJson: false,
				//progressCallback
			});
			console.log(blob);
			download(blob, "db1090_export.json", "application/json");
		} catch (error) {
			console.error('' + error);
		}
	};
	blogGenerate();
	//	});

}
