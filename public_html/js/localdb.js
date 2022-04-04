$.getScript("./js/dexie-export-import.min.js");
$.getScript("./js/download.min.js");
$.getScript("./js/chartist.min.js"); //Charts are locacl Db dependant

var locDb = new Dexie("db1090");

locDb.version(1.6).stores({
	aircraft: "++id,&icao,lastSeen,firstSeen,flight, sightCount",
	signalStrenght: "++id,&sector,alt,rssi",
	dailyLog: "&day, acIds",
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
				}
				dbAircraftRegisterDaily(aircraftData.id); //Log to daily AC
			}).then(function() {
				locDb.aircraft.where('icao').equals(planeIcao).modify({
					lastSeen: currentTime,
					flight: flight,
					sightCount: newSightCount
				});
			});
		}
	});
}

//Daily log of aircrafts ids
async function dbAircraftRegisterDaily(planeIcao) {
	var exist = false;
	var today = new Date();
	const offset = today.getTimezoneOffset();
	today = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

	locDb.dailyLog.where('day').equals(today).count(function(count) {
		count == 0 ? exist = false : exist = true
	}).then(function() {
		if (!exist) {
			locDb.dailyLog.add({
				day: today,
				acIds: []
			});
			console.log('Daily log added: ' + today);
		} else {
			locDb.dailyLog.get({
				day: today
			}).then(function(daily) {
				addIcao = daily.acIds;
				if (addIcao.indexOf(planeIcao) === -1) {
					addIcao.push(planeIcao);
					locDb.dailyLog.where('day').equals(today).modify({
						acIds: addIcao
					});
				}
			});
		}
	});
}

//Get stats from DB and draw charts
async function dbAircraftGetStats() {
	var chartDailySeen = new Chartist.Bar('.chartDailySeen', {}, {});
	var chartTopSeen = new Chartist.Bar('.chartTopSeen', {}, {});
	var dailyStatsDay = [];
	var dailyStatsCount = [];
	var dailyStatsNewCount = [];
	let allTopSeen = [];
	let allTopSeenCount = [];

	await locDb.table("dailyLog").orderBy('day').limit(14).toArray().then(function(result) {
		result.forEach(function(item, index) {
			dailyStatsDay.push(item.day);
			dailyStatsCount.push(Object.keys(item.acIds).length);
		});
	}).then(function(result) {
		locDb.table("aircraft").orderBy('firstSeen').reverse().toArray().then(function(result) {
			result.forEach(function(item) {
				var oneDay = new Date(item.firstSeen).toISOString().split('T')[0];
				if (dailyStatsDay.includes(oneDay)) {
					dailyStatsNewCount[oneDay] = (dailyStatsNewCount[oneDay] || 0) + 1;
				}
			});
		}).then(function(result) {
			chartDailySeen.update({
				labels: dailyStatsDay,
				series: [dailyStatsCount, Object.values(dailyStatsNewCount).reverse()]
			});
		});
	});

	await locDb.table("aircraft").orderBy('sightCount').reverse().limit(10).toArray().then(function(result) {
		result.forEach(function(item) {
			allTopSeen.push(item.icao+"\n("+item.sightCount+")");
			allTopSeenCount.push(item.sightCount);
		});
		chartTopSeen.update({
			labels: allTopSeen,
			series: [allTopSeenCount]
		});
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
