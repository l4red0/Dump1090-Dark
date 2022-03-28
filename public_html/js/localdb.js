$.getScript("/js/dexie-export-import.min.js");
$.getScript("/js/download.min.js");

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

//refresh DB statistics
async function dbStats() {
	locDb.aircraft.count(function(count) {
		$('.dbStatsRegisterd').text(count + 1);
	});
	isStoragePersisted().then(function() {
		$('.dbPersistant span').text("DB is persistant");
	});
	showEstimatedQuota().then(function(quotaData) {
		var usage = formatBytes(quotaData.usage);
		var quota = formatBytes(quotaData.quota);
		$('.dbStatsSize').text(usage + " (quota: " + quota + ")");
	});
}

//exporting dexie DB
async function dbExport() {
	console.log('export initiated');
	const exportLink = document.getElementById('exportLink');
	async function blobGenerate() {
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
	blobGenerate();
}

//check if indexedDB is persistant
async function isStoragePersisted() {
	return await navigator.storage && navigator.storage.persisted &&
		navigator.storage.persisted();
}

function dbPersistant() {
	isStoragePersisted().then(async isPersisted => {
		if (isPersisted) {
			alert("Storage is successfully persisted.");
		} else {
			alert("Storage is not persisted.");
			alert("Trying to persist..:");
			if (await navigator.storage.persist()) {
				alert("Successfully turned the storage to be persisted.");
			} else {
				alert("Failed to make storage persisted");
			}
		}
	})
}

//DB volume and quota information (experimental)
async function showEstimatedQuota() {
	return await navigator.storage && navigator.storage.estimate ?
		navigator.storage.estimate() :
		undefined;
}
