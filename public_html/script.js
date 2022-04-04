// -*- mode: javascript; indent-tabs-mode: nil; c-basic-offset: 8 -*-
"use strict";

// Define our global variables
var OLMap = null;
var StaticFeatures = new ol.Collection();
var SiteCircleFeatures = new ol.Collection();
var PlaneIconFeatures = new ol.Collection();
var PlaneTrailFeatures = new ol.Collection();
var MyFeatures = new ol.Collection(); // AKISSACK Ref: AK9U
var MaxRangeFeatures = new ol.Collection(); // AKISSACK Ref: AK8A
var SleafordRangeFeatures = new ol.Collection(); // AKISSACK Ref: AK8Z
var signalPlotLayerFeatures = new ol.Collection();
var Planes = {};
var PlanesOrdered = [];
var PlaneFilter = {};
var SelectedPlane = null;
var SelectedAllPlanes = false;
var FollowSelected = false;
var historyMaxRange = null;
var sndAlertEnabled = false;
var currentIcaos = [];

//OL6 vars
var Overlay = ol.Overlay;
var View = ol.View;
var toStringHDMS = ol.coordinate.toStringHDMS;
var TileLayer = ol.layer.Tile;
var toLonLat = ol.proj.toLonLat;
var Circle = ol.geom.Circle;
var Feature = ol.Feature;
var Style = ol.style.Style;
var fromLonLat = ol.proj.fromLonLat;
var Transform = ol.Transform;
var Sphere = ol.Sphere;

// --------------------------------------------------------------------------------------
// AKISSACK - Variables -----------------------------------------------------------------
// --------------------------------------------------------------------------------------
var acsntext = ' '; // Default label for label data -            Ref: AK7C
var SelectedMilPlanes = false; // Allow selection of all planes of interest Ref: AK9G
// --------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------- AKISSACK
var SpecialSquawks = {
	'7500': {
		cssClass: 'squawk7500',
		markerColor: 'rgb(255, 85, 85)',
		text: 'Aircraft Hijacking'
	},
	'7600': {
		cssClass: 'squawk7600',
		markerColor: 'rgb(0, 255, 255)',
		text: 'Radio Failure'
	},
	'7700': {
		cssClass: 'squawk7700',
		markerColor: 'rgb(255, 255, 0)',
		text: 'General Emergency'
	}
};

// Get current map settings
var CenterLat, CenterLon, ZoomLvl, MapType;

var Dump1090Version = "unknown version";
var RefreshInterval = 1000;

var PlaneRowTemplate = null;

var TrackedAircraft = 0;
var TrackedAircraftPositions = 0;
var TrackedHistorySize = 0;
var MaxRange = 0; // AKISSACK Range display Ref: AK9T
var CurMaxRange = 0; // AKISSACK Range display Ref: AK9T
var CurMinRange = 999; // AKISSACK Range display Ref: AK9T
var MaxRngRange = []; // AKISSACK Range plot    Ref: AK8B
var MaxRngLat = []; // AKISSACK Range plot    Ref: AK8B
var MaxRngLon = []; // AKISSACK Range plot    Ref: AK8B
var MidRngRange = []; // AKISSACK Range plot    Ref: AK8B
var MidRngLat = []; // AKISSACK Range plot    Ref: AK8B
var MidRngLon = []; // AKISSACK Range plot    Ref: AK8B
var MinRngRange = []; // AKISSACK Range plot    Ref: AK8B
var MinRngLat = []; // AKISSACK Range plot    Ref: AK8B
var MinRngLon = []; // AKISSACK Range plot    Ref: AK8B

if (SiteLat !== '' && SiteLon !== '') {
	SitePosition = [SiteLon, SiteLat];
} else {
	var SitePosition = null;
}
var ReceiverClock = null;

var LastReceiverTimestamp = 0;
var StaleReceiverCount = 0;
var FetchPending = null;

var MessageCountHistory = [];
var MessageRate = 0;

var NBSP = '\u00a0';

function processReceiverUpdate(data) {
	// Loop through all the planes in the data packet
	var now = data.now;
	var acs = data.aircraft;

	// Detect stats reset
	if (MessageCountHistory.length > 0 && MessageCountHistory[MessageCountHistory.length - 1].messages > data.messages) {
		MessageCountHistory = [{
			'time': MessageCountHistory[MessageCountHistory.length - 1].time,
			'messages': 0
	}];
	}

	// Note the message count in the history
	MessageCountHistory.push({
		'time': now,
		'messages': data.messages
	});
	// .. and clean up any old values
	if ((now - MessageCountHistory[0].time) > 30)
		MessageCountHistory.shift();

	for (var j = 0; j < acs.length; j++) {
		var ac = acs[j];
		var hex = ac.hex;
		var squawk = ac.squawk;
		var plane = null;

		// Do we already have this plane object in Planes?
		// If not make it.

		if (Planes[hex]) {
			plane = Planes[hex];
		} else {
			plane = new PlaneObject(hex);
			plane.filter = PlaneFilter;
			plane.tr = PlaneRowTemplate.cloneNode(true);

			if (hex[0] === '~') {
				// Non-ICAO address
				plane.tr.cells[1].textContent = hex.substring(1);
				$(plane.tr).css('font-style', 'italic');
			} else {
				plane.tr.cells[1].textContent = hex;
			}

			// set flag image if available
			if (ShowFlags && plane.icaorange.flag_image !== null) {
				$('img', plane.tr.cells[0]).attr('src', FlagPath + plane.icaorange.flag_image);
				$('img', plane.tr.cells[0]).attr('title', plane.icaorange.country);
			} else {
				$('img', plane.tr.cells[0]).css('display', 'none');
			}

			plane.tr.addEventListener('click', function(h, evt) {

				if (evt.srcElement instanceof HTMLAnchorElement) {
					evt.stopPropagation();
					return;
				}


				if (!$("#map_container").is(":visible")) {
					showMap();
				}
				selectPlaneByHex(h, false);
				getPlaneSpottersApiData(h);
				getVariousLinksFlight();
				$("#mainTabs").tabs({
					active: 0
				});
				evt.preventDefault();
			}.bind(undefined, hex));

			plane.tr.addEventListener('dblclick', function(h, evt) {
				if (!$("#map_container").is(":visible")) {
					showMap();
				}
				selectPlaneByHex(h, true);
				evt.preventDefault();
			}.bind(undefined, hex));

			Planes[hex] = plane;

			PlanesOrdered.push(plane);
		}

		// Call the function update
		plane.updateData(now, ac);
		//localStorage.setItem("currentIcaos", JSON.stringify(Array.from(Object.getOwnPropertyNames(Planes))));
	}
}

function fetchData() {
	if (FetchPending !== null && FetchPending.state() == 'pending') {
		// don't double up on fetches, let the last one resolve
		return;
	}

	FetchPending = $.ajax({
		url: EndpointDump1090 + 'data/aircraft.json',
		timeout: 5000,
		cache: false,
		dataType: 'json'
	});
	FetchPending.done(function(data) {
		var now = data.now;

		processReceiverUpdate(data);

		// update timestamps, visibility, history track for all planes - not only those updated
		for (var i = 0; i < PlanesOrdered.length; ++i) {
			var plane = PlanesOrdered[i];
			plane.updateTick(now, LastReceiverTimestamp);
		}

		selectNewPlanes();
		refreshTableInfo();
		refreshSelected();

		if (ReceiverClock) {
			var rcv = new Date(now * 1000);
			ReceiverClock.render(rcv.getUTCHours(), rcv.getUTCMinutes(), rcv.getUTCSeconds());
		}

		// Check for stale receiver data
		if (LastReceiverTimestamp === now) {
			StaleReceiverCount++;
			if (StaleReceiverCount > 5) {
				$("#update_error_detail").text("The data from dump1090 hasn't been updated in a while. Maybe dump1090 is no longer running?");
				$("#update_error").css('display', 'block');
			}
		} else {
			StaleReceiverCount = 0;
			LastReceiverTimestamp = now;
			$("#update_error").css('display', 'none');
		}
	});

	FetchPending.fail(function(jqxhr, status, error) {
		$("#update_error_detail").text("AJAX call failed (" + status + (error ? (": " + error) : "") + "). Maybe dump1090 is no longer running?");
		$("#update_error").css('display', 'block');
	});
}

var PositionHistorySize = 0;

function initialize() {
	// Set page basics
	document.title = PageName;
	MaxRange = 0; // AKISSACK  Display range  Ref: AK9T

	//history max range
	if (localStorage.getItem('historyMaxRange') === null) {
		localStorage.setItem('historyMaxRange', format_distance_brief(MaxRange, DisplayUnits))
	} else {
		historyMaxRange = localStorage.getItem('historyMaxRange')
	}

	// $("#infoblock_name").text(PageName); AKISSACK - Ref: AK9W
	$("#infoblock_name").text('');

	PlaneRowTemplate = document.getElementById("plane_row_template");

	$("#loader").removeClass("hidden");

	// Set up map/sidebar splitter
	$("#sidebar_container").resizable({
		handles: {
			w: '#splitter'
		}
	});


	// Set up event handlers for buttons
	$("#toggle_sidebar_button").click(toggleSidebarVisibility);
	$("#expand_sidebar_button").click(expandSidebar);
	$("#show_map_button").click(showMap);

	// Set initial element visibility
	$("#show_map_button").hide();
	setColumnVisibility();

	// Initialize other controls
	initializeUnitsSelector();

	// Set up altitude filter button event handlers and validation options
	$("#altitude_filter_form").submit(onFilterByAltitude);
	$("#altitude_filter_form").validate({
		errorPlacement: function(error, element) {
			return true;
		},

		rules: {
			minAltitude: {
				number: true,
				min: -99999,
				max: 99999
			},
			maxAltitude: {
				number: true,
				min: -99999,
				max: 99999
			}
		}
	});
	$("#altitude_filter_reset_button").click(onResetAltitudeFilter);

	// Force map to redraw if sidebar container is resized - use a timer to debounce
	var mapResizeTimeout;
	$("#sidebar_container").on("resize", function() {
		clearTimeout(mapResizeTimeout);
		mapResizeTimeout = setTimeout(updateMapSize, 10);
	});

	// Get receiver metadata, reconfigure using it, then continue
	// with initialization
	$.ajax({
			url: EndpointDump1090 + 'data/receiver.json',
			timeout: 5000,
			cache: false,
			dataType: 'json'
		})

		.done(function(data) {
			if (typeof data.lat !== "undefined" && SiteLat == "" && SiteLon == "") {
				SiteShow = true;
				SiteLat = data.lat;
				SiteLon = data.lon;
				DefaultCenterLat = data.lat;
				DefaultCenterLon = data.lon;
			}

			Dump1090Version = data.version;
			RefreshInterval = data.refresh;
			PositionHistorySize = data.history;
		})

		.always(function() {
			initialize_map();
			start_load_history();
		});


	// AKISSACK Range plot - Now able to read from local storage if available Ref: AK8C

	if (localStorage.getItem('MaxRngLon') && localStorage.getItem('MaxRngLat') && localStorage.getItem('MaxRngRange')) {
		//console.log("Loading max range");
		MaxRngLat = JSON.parse(localStorage.getItem('MaxRngLat'));
		MaxRngLon = JSON.parse(localStorage.getItem('MaxRngLon'));
		MaxRngRange = JSON.parse(localStorage.getItem('MaxRngRange'));
	} else {
		for (var j = 0; j <= 360; j++) {
			MaxRngRange[j] = 0;
			MaxRngLat[j] = SiteLat;
			MaxRngLon[j] = SiteLon;
		}
	}
	if (localStorage.getItem('MidRngLon') && localStorage.getItem('MidRngLat') && localStorage.getItem('MidRngRange')) {
		//console.log("Loading mid range");
		MidRngLat = JSON.parse(localStorage.getItem('MidRngLat'));
		MidRngLon = JSON.parse(localStorage.getItem('MidRngLon'));
		MidRngRange = JSON.parse(localStorage.getItem('MidRngRange'));
	} else {
		for (var j = 0; j <= 360; j++) {
			MidRngRange[j] = 0;
			MidRngLat[j] = SiteLat;
			MidRngLon[j] = SiteLon;
		}
	}
	if (localStorage.getItem('MinRngLon') && localStorage.getItem('MinRngLat') && localStorage.getItem('MinRngRange')) {
		//console.log("Loading min range");
		MinRngLat = JSON.parse(localStorage.getItem('MinRngLat'));
		MinRngLon = JSON.parse(localStorage.getItem('MinRngLon'));
		MinRngRange = JSON.parse(localStorage.getItem('MinRngRange'));
	} else {
		for (var j = 0; j <= 360; j++) {
			MinRngRange[j] = 0;
			MinRngLat[j] = SiteLat;
			MinRngLon[j] = SiteLon;
		}
	}
}

var CurrentHistoryFetch = null;
var PositionHistoryBuffer = []

function start_load_history() {
	if (PositionHistorySize > 0 && window.location.hash != '#nohistory') {
		$("#loaderProgress").attr('max', PositionHistorySize);
		console.log("Starting to load history (" + PositionHistorySize + " items)");
		load_history_item(0);
	} else {
		end_load_history();
	}
}

function load_history_item(i) {
	if (i >= PositionHistorySize) {
		end_load_history();
		return;
	}

	// Ref: AK9Y  --  console.log("Loading history #" + i);
	$("#loaderProgress").attr('value', i);

	$.ajax({
			url: EndpointDump1090 + 'data/history_' + i + '.json',
			timeout: 5000,
			cache: false,
			dataType: 'json'
		})

		.done(function(data) {
			PositionHistoryBuffer.push(data);
			load_history_item(i + 1);
		})

		.fail(function(jqxhr, status, error) {
			// No more history
			end_load_history();
		});
}

function end_load_history() {
	$("#loader").addClass("hidden");

	console.log("Done loading history");

	if (PositionHistoryBuffer.length > 0) {
		var now, last = 0;

		// Sort history by timestamp
		console.log("Sorting history");
		PositionHistoryBuffer.sort(function(x, y) {
			return (x.now - y.now);
		});

		// Process history
		for (var h = 0; h < PositionHistoryBuffer.length; ++h) {
			now = PositionHistoryBuffer[h].now;
			// Ref: AK9Y  --  console.log("Applying history " + h + "/" + PositionHistoryBuffer.length + " at: " + now);
			processReceiverUpdate(PositionHistoryBuffer[h]);

			// update track
			// Ref: AK9Y  --  console.log("Updating tracks at: " + now);
			for (var i = 0; i < PlanesOrdered.length; ++i) {
				var plane = PlanesOrdered[i];
				plane.updateTrack((now - last) + 1);
			}

			last = now;
		}

		// Final pass to update all planes to their latest state
		console.log("Final history cleanup pass");
		for (var i = 0; i < PlanesOrdered.length; ++i) {
			var plane = PlanesOrdered[i];
			plane.updateTick(now);
		}

		LastReceiverTimestamp = last;
	}

	PositionHistoryBuffer = null;


	updateMapSize();
	refreshTableInfo();
	refreshSelected();
	reaper();
	console.log("Completing init");

	// Setup our timer to poll from the server.
	window.setInterval(fetchData, RefreshInterval);
	window.setInterval(reaper, 60000);

	// And kick off one refresh immediately.
	fetchData();

}
//MOUSE POSITION COORDINATES OL6
const mousePositionControl = new ol.control.MousePosition({
  coordinateFormat: ol.coordinate.createStringXY(4),
  projection: 'EPSG:4326',
  className: 'mp',
});


// Initalizes the map and starts up our timers to call various functions
function initialize_map() {
	// Load stored map settings if present
	CenterLat = Number(localStorage['CenterLat']) || DefaultCenterLat;
	CenterLon = Number(localStorage['CenterLon']) || DefaultCenterLon;
	ZoomLvl = Number(localStorage['ZoomLvl']) || DefaultZoomLvl;
	MapType = localStorage['MapType'];

	// Set SitePosition, initialize sorting
	if (SiteShow && (typeof SiteLat !== 'undefined') && (typeof SiteLon !== 'undefined')) {
		SitePosition = [SiteLon, SiteLat];
		sortByDistance();
	} else {
		SitePosition = null;
		PlaneRowTemplate.cells[9].style.display = 'none'; // hide distance column
		document.getElementById("distance").style.display = 'none'; // hide distance header
		sortByAltitude();
	}

	// Maybe hide flag info
	if (!ShowFlags) {
		PlaneRowTemplate.cells[0].style.display = 'none'; // hide flag column
		document.getElementById("flag").style.display = 'none'; // hide flag header
		document.getElementById("infoblock_country").style.display = 'none'; // hide country row
	}

	OLMap = new ol.Map({
		target: 'map_canvas',
		layers: layers,
		view: new ol.View({
			center: ol.proj.fromLonLat([CenterLon, CenterLat]),
			zoom: ZoomLvl
		}),
		controls: [new ol.control.Zoom(),
	  //new ol.control.ZoomSlider(),
	  new ol.control.Rotate(true),
	  new ol.control.Attribution({
				collapsed: true
			}),
	  new ol.control.ScaleLine({
				units: DisplayUnits,
				bar: false,
				steps: 4,
				minWidth: 100
			}),
	],
		loadTilesWhileAnimating: true,
		loadTilesWhileInteracting: true
	});

	var layerSwitcher = new ol.control.LayerSwitcher({
		tipLabel: 'Layers',
		groupSelectStyle: 'group', // Can be 'children' [default], 'group' or 'none'
		activationMode: 'click'
	});

	ShowMouseLatLong ? OLMap.addControl(mousePositionControl) : null ;

	OLMap.addControl(layerSwitcher);
	$('.layer-switcher button').html('<i icon-name="layers"></i>');
	//todo
	$('button[aria-label="Layers"]').click(function() {
		$('button[aria-label="Layers"]').html('<i icon-name="layers"></i>');
	});

	//Save layers settings in local storage
	var foundType = false;
	ol.control.LayerSwitcher.forEachRecursive(OLMap, function(lyr) {
		if (!lyr.get('name'))
			return;
		if (lyr.get('type') === 'base') {
			if (MapType === lyr.get('name')) {
				foundType = true;
				lyr.setVisible(true);
			} else {
				lyr.setVisible(false);
			}

			lyr.on('change:visible', function(evt) {
				if (evt.target.getVisible()) {
					MapType = localStorage['MapType'] = evt.target.get('name');
				}
			});
		} else if (lyr.get('type') === 'overlay') {
			var visible = localStorage['layer_' + lyr.get('name')];
			if (visible != undefined) {
				// javascript, why must you taunt me with gratuitous type problems
				lyr.setVisible(visible === "true");
			}

			lyr.on('change:visible', function(evt) {
				localStorage['layer_' + evt.target.get('name')] = evt.target.getVisible();
			});
		}
	})

	if (!foundType) {
		ol.control.LayerSwitcher.forEachRecursive(OLMap, function(lyr) {
			if (foundType)
				return;
			if (lyr.get('type') === 'base') {
				lyr.setVisible(true);
				foundType = true;
			}
		});
	}


	// Listeners for newly created Map
	OLMap.getView().on('change:center', function(event) {
		var center = ol.proj.toLonLat(OLMap.getView().getCenter(), OLMap.getView().getProjection());
		localStorage['CenterLon'] = center[0]
		localStorage['CenterLat'] = center[1]
		if (FollowSelected) {
			// On manual navigation, disable follow
			var selected = Planes[SelectedPlane];
			if (Math.abs(center[0] - selected.position[0]) > 0.0001 &&
				Math.abs(center[1] - selected.position[1]) > 0.0001) {
				FollowSelected = false;
				refreshSelected();
			}
		}
	});

	OLMap.getView().on('change:resolution', function(event) {
		ZoomLvl = localStorage['ZoomLvl'] = OLMap.getView().getZoom();
		for (var plane in Planes) {
			Planes[plane].updateMarker(false);
		};
	});

	OLMap.on(['click', 'dblclick'], function(evt) {
		var hex = evt.map.forEachFeatureAtPixel(evt.pixel,
			function(feature, layer) {
				return feature.hex;
			},
			function(layer) {
				return (layer === iconsLayer);
			}, 48, true);

		if (hex) {
			selectPlaneByHex(hex, (evt.type === 'dblclick'));
			FollowSelected = true;
			$("#mainTabs").tabs({
				active: 0
			});
			evt.stopPropagation();
		} else {
			deselectAllPlanes();
			FollowSelected = false;
			evt.stopPropagation();
		}

		if (FollowSelected) {
			FollowSelected = false;
			refreshSelected();
		}
	});

	//------------------------------------------------------------------------------------
	// Ref: AK1C Ends ----------------------------------------------------------- AKISSACK
	//------------------------------------------------------------------------------------

	//------------------------------------------------------------------------------------
	// // AKISSACK Ref: AK8X -------------------------------------------------------------
	//------------------------------------------------------------------------------------
	// Read the stored maximum range (lat/long) from my mySql database and then plot these
	// as a polygon.  This will be update as positions are logged and will therefore become more
	// accurate, although rouge spikes will need to be manually removed from the database
	// Expanded to include the 2 other rings too, if required
	/*
	var polyCoordsMax = [];
	var polyCoordsMid = [];
	var polyCoordsMin = [];


	$(function() {
		$.ajax({
			url: 'sql/sql-best-ranges.php',
			data: "",
			dataType: 'json',
			success: function(data) {
				processMrData(data)
			}
		});
	});

	function processMrData(allRData) {

		for (var i in allRData) {
			var oneRPoint = allRData[i];
			polyCoordsMax.push(ol.proj.transform([parseFloat(oneRPoint[9]), parseFloat(oneRPoint[8])], 'EPSG:4326', 'EPSG:3857'));
			polyCoordsMid.push(ol.proj.transform([parseFloat(oneRPoint[6]), parseFloat(oneRPoint[5])], 'EPSG:4326', 'EPSG:3857'));
			polyCoordsMin.push(ol.proj.transform([parseFloat(oneRPoint[3]), parseFloat(oneRPoint[2])], 'EPSG:4326', 'EPSG:3857'));
		};

		var styleMax = new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: 'rgba(0,0,255, 1)',
				width: 0.5
			}),
			fill: new ol.style.Fill({
				color: 'rgba(0,0,255, 0.01)'
			})
		})
		var rfeatureMax = new ol.Feature({
			geometry: new ol.geom.Polygon([polyCoordsMax])
		});
		rfeatureMax.setStyle(styleMax)
		SleafordRangeFeatures.push(rfeatureMax);

		if (MidRangeHeight > 0) {
			var styleMid = new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'rgba(0,64,0, 1)',
					width: 0.5
				}),
				fill: new ol.style.Fill({
					color: 'rgba(0,255,0, 0.01)'
				})
			})

			var rfeatureMid = new ol.Feature({
				geometry: new ol.geom.Polygon([polyCoordsMid])
			});
			rfeatureMid.setStyle(styleMid)
			SleafordRangeFeatures.push(rfeatureMid);
		}

		if (MinRangeHeight > 0) {
			var styleMin = new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'rgba(64,0,0, 1)',
					width: 0.5
				}),
				fill: new ol.style.Fill({
					color: 'rgba(255,0,0, 0.01)'
				})
			})

			var rfeatureMin = new ol.Feature({
				geometry: new ol.geom.Polygon([polyCoordsMin])
			});
			rfeatureMin.setStyle(styleMin)
			SleafordRangeFeatures.push(rfeatureMin);
		}
	}
	*/
	//------------------------------------------------------------------------------------
	// Ref: AK8X Ends ----------------------------------------------------------- AKISSACK
	//------------------------------------------------------------------------------------


	//------------------------------------------------------------------------------------
	// AKISSACK - HOVER OVER LABELS ------------------------------------- ref: AK6D starts
	//------------------------------------------------------------------------------------
	if (ShowHoverOverLabels) {
		var overlay = new ol.Overlay({
			element: document.getElementById('popinfo'),
			positioning: 'bottom-left'
		});
		overlay.setMap(OLMap);

		// trap mouse moving over
		//var hitTolerance = 100;
		OLMap.on('pointermove', function(evt) {
			//console.log(evt.pixel);
			var feature = OLMap.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
				overlay.setPosition(evt.coordinate);
				var popname = feature.get('name');


				if (ShowMyFindsLayer && (typeof popname != 'undefined') && popname != '~') {
					overlay.getElement().innerHTML = (popname ? popname : '');
					return feature;
				}
				if (popname === '~') {
					var vsi = '';
					if (Planes[feature.hex].vert_rate !== 'undefined') { // Correct odd errors
						if (Planes[feature.hex].vert_rate > 256) {
							vsi = 'climbing';
						} else {
							if (Planes[feature.hex].vert_rate < -256) {
								vsi = 'descending';
							} else vsi = 'level';
						};
					};
					if (ShowAdditionalData) {
						//LINE ONE
						popname = (Planes[feature.hex].ac_aircraft ? Planes[feature.hex].ac_aircraft : '-');
						if (popname === '-') {
							//  Let's try an alternative to ID -> https://github.com/alkissack/Dump1090-OpenLayers3-html/issues/3
							popname = (Planes[feature.hex].icaotype ? Planes[feature.hex].icaotype : 'Unknown aircraft type');
						}
						popname = popname + ' [' + (Planes[feature.hex].category ? Planes[feature.hex].category : '?') + ']';
						//LINE TWO
						popname = popname + '\n(' + (Planes[feature.hex].flight ? Planes[feature.hex].flight.trim() : 'No Call') + ')';
						popname = popname + ' #' + feature.hex.toUpperCase();
						popname = popname + ' [' + Planes[feature.hex].registration + ']';

						//LINE THREE
						popname = popname + '\n' + (Planes[feature.hex].altitude ? parseInt(Planes[feature.hex].altitude) : '?');
						popname = popname + ' ft and ' + vsi;
						//LINE FOUR
						popname = popname + '\n' + (Planes[feature.hex].country ? Planes[feature.hex].country : '');
						popname = popname + ' ' + (Planes[feature.hex].operator ? Planes[feature.hex].operator : '');
						popname = popname + ' ' + (Planes[feature.hex].siteNm ? Planes[feature.hex].siteNm + "nm" : '');
						popname = popname + ' ' + (Planes[feature.hex].siteBearing ? Planes[feature.hex].siteBearing + "\u00B0" : '');

					} else {
						popname = 'ICAO: ' + Planes[feature.hex].icao;
						popname = popname + '\nFlt:  ' + (Planes[feature.hex].flight ? Planes[feature.hex].flight : '?');
						popname = popname + '\nType: ' + (Planes[feature.hex].icaotype ? Planes[feature.hex].icaotype : '?');
						popname = popname + '\nReg:  ' + (Planes[feature.hex].registration ? Planes[feature.hex].registration : '?');
						popname = popname + '\nFt:   ' + (Planes[feature.hex].altitude ? parseInt(Planes[feature.hex].altitude) : '?');
					}
					overlay.getElement().innerHTML = (popname ? popname : '');
					return feature;
				} else {
					//overlay.getElement().innerHTML = (popname  ?  popname   :'' );
					//return feature;
					return null;
				}
			}, function(layer) {
				if (ShowMyFindsLayer) {
					return (layer == iconsLayer, MyFeatures);
				} else {
					return (layer == iconsLayer);
				}
			}); //OLMap.forEachFeatureAtPixel

			overlay.getElement().style.display = feature ? '' : 'none'; // EAK--> Needs GMAP/INDEX.HTML
			document.body.style.cursor = feature ? 'pointer' : '';
		});
	} else { // Labels are not required
		var overlay = new ol.Overlay({
			element: document.getElementById('popinfo'),
			positioning: 'bottom-left'
		});
		overlay.setMap(OLMap);
	}
	//------------------------------------------------------------------------------------
	// -------------------------------------------------------------------- ref: AK6D ends
	//------------------------------------------------------------------------------------


	// Add home marker if requested
	if (SitePosition) {
		if (ShowMyPreferences) { // Personal preferences Ref: AK9V
			var homeRad = 2;
			var homeWid = 1;
		} else {
			var homeRad = 7;
			var homeWid = 2;
		}
		var markerStyle = new ol.style.Style({
			image: new ol.style.Circle({
				radius: homeRad, // Ref: AK9V
				snapToPixel: false,
				fill: new ol.style.Fill({
					color: 'black'
				}),
				stroke: new ol.style.Stroke({
					color: 'white',
					width: homeWid // Ref: AK9V
				})
			})
		});

		var feature = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(SitePosition)));
		feature.setStyle(markerStyle);
		StaticFeatures.push(feature);

		if (SiteCircles) {
			createSiteCircleFeatures();
		}
	}

	if (OL3) {
		// TODO OL6
		// Add terrain-limit rings.
		// kick off an ajax request that will add the rings when it's done
		if (!PanoramaRingsJson === false) {
			var request = $.ajax({
				url: PanoramaRingsJson,
				timeout: 5000,
				cache: true,
				dataType: 'json'
			});


			request.done(function(data) {
				var ringStyle;

				if (UseDefaultTerrianRings) {
					ringStyle = new ol.style.Style({
						fill: null,
						stroke: new ol.style.Stroke({
							color: '#000000',
							lineDash: UseTerrianLineDash ? [4, 4] : null,
							width: TerrianLineWidth
						})
					});
				} else {
					ringStyle = [];

					for (var i = 0; i < TerrianAltitudes.length; ++i) {
						ringStyle.push(new ol.style.Style({
							fill: null,
							stroke: new ol.style.Stroke({
								color: getTerrianColorByAlti(TerrianAltitudes[i]),
								lineDash: UseTerrianLineDash ? [4, 4] : null,
								width: TerrianLineWidth
							})
						}));
					}
				}

				for (var i = 0; i < data.rings.length; ++i) {
					var geom = new ol.geom.LineString();
					var points = data.rings[i].points;
					if (points.length > 0) {
						for (var j = 0; j < points.length; ++j) {
							geom.appendCoordinate([points[j][1], points[j][0]]);
						}
						geom.appendCoordinate([points[0][1], points[0][0]]);
						geom.transform('EPSG:4326', 'EPSG:3857');

						var feature = new ol.Feature(geom);
						if (UseDefaultTerrianRings) {
							feature.setStyle(ringStyle);
						} else {
							feature.setStyle(ringStyle[i]);
						}
						StaticFeatures.push(feature);
					}
				}
			});

			request.fail(function(jqxhr, status, error) {
				// no rings available, do nothing
			});
		}
	}

}

function createSiteCircleFeatures() {
	var radius;
	var siteCricleStyle = function(radius) {
		var radius = convert_distance(radius, DisplayUnits) + " " + get_unit_label("distance", DisplayUnits);
		return new Style({
			//stroke: new ol.style.Stroke({color: 'rgba(1,135,134,0.8)', width: 1}),
			//fill: new ol.style.Fill({color: 'rgba(55,0,179,0.05)'}),
			stroke: new ol.style.Stroke({
				color: 'rgba(0,62,62,0.4)',
				width: 1
			}),
			text: new ol.style.Text({
				font: 'normal 10px "Inconsolata", monospace',
				fill: new ol.style.Fill({
					color: 'rgba(255,255,255,1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(0,62,62,0.8)',
					width: 5
				}),
				text: ShowSiteRingDistanceText ? radius : '',
				placement: 'line',
				backgroundFill: new ol.style.Fill({
					color: 'rgba(0,62,62,1)'
				})
			})
		});

	};

	for (var i = 0; i < SiteCirclesDistances.length; ++i) {
		var radius = SiteCirclesDistances[i] * unitsConversionFactor();
		var siteCricle = new ol.Feature({
			geometry: ol.geom.Polygon.circular(SitePosition, radius, 128).transform('EPSG:4326', 'EPSG:3857'),
			name: radius
		});
		siteCricle.setStyle(siteCricleStyle(radius));
		StaticFeatures.push(siteCricle);
	}
}

// This looks for planes to reap out of the master Planes variable
function reaper() {
	//console.log("Reaping started..");

	// Look for planes where we have seen no messages for >300 seconds
	var newPlanes = [];
	for (var i = 0; i < PlanesOrdered.length; ++i) {
		var plane = PlanesOrdered[i];

		if (plane.seen > 300) {
			// Reap it.
			plane.tr.parentNode.removeChild(plane.tr);
			plane.tr = null;
			delete Planes[plane.icao];
			plane.destroy();
			if ($('tr#plane_row_template').css('display') == 'none') {
				$(this).remove();
			}
		} else {
			// Keep it.
			newPlanes.push(plane);
		}
	};

	PlanesOrdered = newPlanes;
	refreshTableInfo();
	refreshSelected();
}

//------------------------------------------------------------------------------------
// AKISSACK - MOUSE POSITION ----------------------------------- ---- Ref: AK1C starts
//------------------------------------------------------------------------------------
/*
var llFormat = function(dgts) {
	return (
		function(coord1) {
			var coord2 = [coord1[1], coord1[0]];
			// AKISSACK - also add range and bearing if site is known --  Ref: AK1D
			var akret = ol.coordinate.toStringXY(coord2, dgts);
			if (SitePosition !== null) {
				var akbrn = (parseInt(getBearing(SitePosition[1], SitePosition[0], coord1[1], coord1[0]))).toString();
				var akWGS84 = new ol.sphere();
				var akrng = akWGS84.haversineDistance(SitePosition, coord1);
				return akret + " " + akbrn + "\u00B0 " + format_distance_long(akrng, DisplayUnits, 0);
			} else { // no range or bearing required, just return akret
				return akret;
			}
		});
}


var mousePosition = new ol.control.MousePosition({
	coordinateFormat: llFormat(3), // ol.coordinate.createStringXY(4),
	projection: OLMap.getView().getProjection(),
	//target: document.getElementById('mouseposition').innerHTML = "X "+ akLat,
	target: document.getElementById('mouseposition'),
	undefinedHTML: '&nbsp;'
});

if (ShowMouseLatLong) OLMap.addControl(mousePosition);
*/


// Page Title update function
function refreshPageTitle() {
	if (!PlaneCountInTitle && !MessageRateInTitle)
		return;

	var subtitle = "";

	if (PlaneCountInTitle) { // AKISSACK add Max' Range  AK9T
		subtitle += format_distance_brief(CurMinRange, DisplayUnits) + '-' + format_distance_brief(CurMaxRange, DisplayUnits) + '>';
		subtitle += TrackedAircraftPositions + '/' + TrackedAircraft;
	}

	if (MessageRateInTitle && $(MessageRate).length) {
		if (subtitle) subtitle += ' | ';
		subtitle += MessageRate.toFixed(1) + '/s';
	}

	//document.title = PageName + ' - ' + subtitle;  // AKISSACK Ref: AK9X
	document.title = subtitle + ' ' + PageName; // AKISSACK Ref: AK9X

}

// Refresh the detail window about the plane
function refreshSelected() {
	if (MessageCountHistory.length > 1) {
		var message_time_delta = MessageCountHistory[MessageCountHistory.length - 1].time - MessageCountHistory[0].time;
		var message_count_delta = MessageCountHistory[MessageCountHistory.length - 1].messages - MessageCountHistory[0].messages;
		if (message_time_delta > 0)
			MessageRate = message_count_delta / message_time_delta;
	} else {
		MessageRate = null;
	}

	refreshPageTitle();

	var selected = false;
	if (typeof SelectedPlane !== 'undefined' && SelectedPlane != "ICAO" && SelectedPlane != null) {
		selected = Planes[SelectedPlane];
	}

	//$('#dump1090_version').text(Dump1090Version);     AKISSACK Ref: AK9W
	$('#dump1090_version').text(''); // AKISSACK Ref: AK9W
	$('#dump1090_total_ac').text(TrackedAircraft);
	$('#dump1090_total_ac_positions').text(TrackedAircraftPositions);
	$('#dump1090_max_range').text(format_distance_brief(MaxRange, DisplayUnits)); // Ref: AK9T
	$('#dump1090_max_range_history').text(localStorage.getItem('historyMaxRange')); // Ref: AK9T
	$('#dump1090_total_history').text(TrackedHistorySize);

	if (MessageRate !== null) {
		$('#dump1090_message_rate').text(MessageRate.toFixed(1));
	} else {
		$('#dump1090_message_rate').text("n/a");
	}

	setSelectedInfoBlockVisibility();

	if (!selected) {
		return;
	}

	if (selected.flight !== null && selected.flight !== "") {
		$('#selected_callsign').text(selected.flight);
	} else {
		$('#selected_callsign').text('n/a');
	}

	if (selected.registration !== null) {
		$('#selected_registration').text(selected.registration);
	} else {
		$('#selected_registration').text("");
	}

	if (selected.icaotype !== null) {
		$('#selected_icaotype').text(selected.icaotype);
	} else {
		$('#selected_icaotype').text("");
	}

	if (selected.icaotype !== null) {
		$('#selected_model').text(selected.ac_aircraft);
	} else {
		$('#selected_model').text("");
	}

	if (selected.icaotype !== null) {
		$('#selected_category').text(selected.ac_category);
	} else {
		$('#selected_category').text("");
	}

	var emerg = document.getElementById('selected_emergency');
	if (selected.squawk in SpecialSquawks) {
		emerg.className = SpecialSquawks[selected.squawk].cssClass;
		emerg.textContent = NBSP + 'Squawking: ' + SpecialSquawks[selected.squawk].text + NBSP;
	} else {
		emerg.className = 'hidden';
	}

	$('#selected_source').text(Planes[SelectedPlane].getDataSource().toUpperCase());
	$("#selected_altitude").text(format_altitude_long(selected.altitude, selected.vert_rate, DisplayUnits));

	if (selected.squawk === null || selected.squawk === '0000') {
		$('#selected_squawk').text('n/a');
	} else {
		$('#selected_squawk').text(selected.squawk);
	}

	if (FollowSelected) {
		mapAnimateToCoord(Planes[SelectedPlane].position, 13, false);
	}

	$('#selected_speed').text(format_speed_long(selected.speed, DisplayUnits));
	$('#selected_vertical_rate').text(format_vert_rate_long(selected.vert_rate, DisplayUnits));
	$('#selected_icao').text(selected.icao.toUpperCase());
	$('#airframes_post_icao').attr('value', selected.icao);
	$('#selected_track').text(format_track_long(selected.track));

	if (selected.seen <= 1) {
		$('#selected_seen').text('now');
	} else {
		$('#selected_seen').text(selected.seen.toFixed(1) + 's');
	}

	$('#selected_country').text(selected.icaorange.country);
	if (ShowFlags && selected.icaorange.flag_image !== null) {
		$('#selected_flag').removeClass('hidden');
		$('#selected_flag img').attr('src', FlagPath + selected.icaorange.flag_image);
		$('#selected_flag img').attr('title', selected.icaorange.country);
	} else {
		$('#selected_flag').addClass('hidden');
	}

	if (selected.position === null) {
		$('#selected_position').text('n/a');
		$('#selected_follow').addClass('hidden');
	} else {
		var mlat_bit = (selected.position_from_mlat ? "MLAT: " : "");
		if (selected.seen_pos > 1) {
			$('#selected_position').text(mlat_bit + format_latlng(selected.position) + " (" + selected.seen_pos.toFixed(1) + "s)");
		} else {
			$('#selected_position').text(mlat_bit + format_latlng(selected.position));
		}
		$('#selected_follow').removeClass('hidden');
	}

	$('#selected_sitedist').text(format_distance_long(selected.sitedist, DisplayUnits));
	$('#selected_rssi').text(selected.rssi.toFixed(1) + ' dBFS');
	$('#selected_message_count').text(selected.messages);

	if (selected.registration != null) {
		$('#selected_photo_link').html(getJetPhotosPhotoLink(selected.registration));
		$('#selected_photo_link').append(" &bull; " + getFlightAwarePhotoLink(selected.registration));
		$('#selected_photo_link').append(" &bull; " + getPlaneSpottersPhotoLink(selected.registration));
	}
}

//fetch and display planespotters.net image in selected_infoblock
function getPlaneSpottersApiData(hex) {
	$('#selected_infoblock .psImage').html('<div class="genericSpinner rotating"><i icon-name="radio"></i></div>');
	if (hex !== null && hex !== "") {

		$.ajax({
			url: "https://api.planespotters.net/pub/photos/hex/" + hex,
			type: 'GET',
			dataType: 'json',
			cors: false,
			contentType: 'application/json',
			secure: true,
			headers: {
				'Access-Control-Allow-Origin': '*',
			},
			beforeSend: function(xhr) {
				//xhr.setRequestHeader("Authorization", "Basic " + btoa(""));
				$('#selected_infoblock .psImage').html('<div class="genericSpinner rotating"><i icon-name="radio"></i></div>');
			},
			success: function(data) {
				if (data.photos.length >= 1) {
					//delay to not choke API
					setTimeout(function() {
						renderPlaneSpottersImage(data);
					}, 800);
				} else {
					$('#selected_infoblock .psImage').html('<i icon-name="image-off"></i><br>NO MEDIA');
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				console.log("[i] Image cound not be delivered: " + errorThrown + textStatus);
			}
		})
	}
}

function renderPlaneSpottersImage(data) {

	var selectedInfoBlock = $('#selected_infoblock .psImage');
	var psPhotoLink = data.photos[0].link;
	var psPhotoUrl = data.photos[0].thumbnail_large.src;
	var psPhotoAuthor = data.photos[0].photographer;

	var psPhotoDiv = '<img src="' + psPhotoUrl + '" alt="Photo author: ' + psPhotoAuthor + '" style="display:none;"><div class="psPhotoInfo">(c) ' + psPhotoAuthor + ' - <a href="' + psPhotoLink + '" target="_blank">Source</a></div>';

	selectedInfoBlock.html(psPhotoDiv);
	$('#selected_infoblock .psImage img').fadeIn(400);


}

// Refreshes the larger table of all the planes
function refreshTableInfo() {
	var show_squawk_warning = false;

	TrackedAircraft = 0
	TrackedAircraftPositions = 0
	TrackedHistorySize = 0
	CurMaxRange = 0 // AKISSACK  Ref: AK9T
	CurMinRange = 999999 // AKISSACK  Ref: AK9T

	$(".altitudeUnit").text(get_unit_label("altitude", DisplayUnits));
	$(".speedUnit").text(get_unit_label("speed", DisplayUnits));
	$(".distanceUnit").text(get_unit_label("distance", DisplayUnits));
	$(".verticalRateUnit").text(get_unit_label("verticalRate", DisplayUnits));

	for (var i = 0; i < PlanesOrdered.length; ++i) {
		var tableplane = PlanesOrdered[i];
		TrackedHistorySize += tableplane.history_size;

		if (Localdb) {
			dbAircraftRegister(tableplane.icao, tableplane.flight); //locDb
		}

		if (tableplane.seen >= 120 || tableplane.isFiltered()) {

			//$(PlanesOrdered[i].tr).fadeOut("400", function() {
				tableplane.tr.className = "plane_table_row hidden";
			//});

		} else if ($(PlanesOrdered.tr).length && tableplane.seen_pos >= 60) {

			//$(PlanesOrdered[i].tr).fadeOut("400", function() {
				tableplane.tr.className = "plane_table_row hidden";
			//});

		} else {
			TrackedAircraft++;
			// AKISSACK Range display  Ref: AK9T
			if (CurMaxRange < tableplane.sitedist) {
				CurMaxRange = tableplane.sitedist;
				if (CurMaxRange > MaxRange) {
					MaxRange = CurMaxRange;
				}
				//console.log("+"+CurMaxRange);
			}
			if (tableplane.sitedist && CurMinRange > tableplane.sitedist) { // AKISSACK
				CurMinRange = tableplane.sitedist;
				//console.log("-"+CurMinRange);
			}

			if (parseFloat(localStorage.getItem('historyMaxRange')) < parseFloat(format_distance_brief(MaxRange, DisplayUnits))) {
				localStorage.setItem('historyMaxRange', format_distance_brief(MaxRange, DisplayUnits));
			}

			var classes = "plane_table_row hidden";

			if (tableplane.position !== null) {
				classes += " vPosition";
			}

			if (tableplane.position !== null && tableplane.seen_pos < 60) {
				++TrackedAircraftPositions;
				if (tableplane.position_from_mlat)
					classes += " mlat";
				else
					classes += " vPosition";
			}
			if (tableplane.icao == SelectedPlane)
				classes += " selected";

			if (tableplane.position_from_mlat && tableplane.position !== null) {
				classes += " vposMlat";
			}

			if (tableplane.is_interesting == 'Y') { // AKISSACK ------------ Ref: AK9F
				classes += " ofInterest ";
			}

			if (tableplane.position == null && tableplane.seen_pos == null && !tableplane.position_from_mlat)
				classes += " nopos";
			if (tableplane.seen_pos > 30)
				classes += " nopos";

			if (tableplane.squawk in SpecialSquawks) {
				classes = classes + " " + SpecialSquawks[tableplane.squawk].cssClass;
				show_squawk_warning = true;
			}

			if (ShowMyPreferences) {
				tableplane.tr.cells[1].innerHTML = tableplane.icao;
				tableplane.tr.cells[2].textContent = (tableplane.flight !== null ? tableplane.flight : "");
			} else {
				// ICAO doesn't change
				if (tableplane.flight) {
					tableplane.tr.cells[2].innerHTML = getFlightAwareModeSLink(tableplane.icao, tableplane.flight, tableplane.flight);
				} else {
					tableplane.tr.cells[2].innerHTML = "";
				}
			}
			if (ShowMyPreferences && ShowHTMLColumns) { // ------------ Ref: AK9F
				tableplane.tr.cells[3].textContent = (tableplane.registration !== null ? tableplane.registration : "");
				tableplane.tr.cells[4].textContent = (tableplane.icaotype !== null ? tableplane.icaotype : "");
				var tmpTxt1 = (tableplane.ac_aircraft !== null ? tableplane.ac_aircraft : "-");
				if (tmpTxt1 === "-" || tmpTxt1 === "") {
					//  Let's try an alternative to ID -> https://github.com/alkissack/Dump1090-OpenLayers3-html/issues/3
					tmpTxt1 = (tableplane.icaotype ? tableplane.icaotype : 'Unknown aircraft');
					//console.log("-"+tmpTxt1 );
				}
				//tableplane.tr.cells[5].textContent = (tableplane.ac_aircraft !== null ? tableplane.ac_aircraft : "");
				tableplane.tr.cells[5].textContent = tmpTxt1;

				tmpTxt1 = (tableplane.ac_shortname !== null ? tableplane.ac_shortname : "-");
				if (tmpTxt1 === "-" || tmpTxt1 === "") {
					//  Let's try an alternative to ID -> https://github.com/alkissack/Dump1090-OpenLayers3-html/issues/3
					tmpTxt1 = (tableplane.icaotype ? tableplane.icaotype : 'Unknown');
					//console.log("-"+tmpTxt1 );
				}
				//tmpTxt1 = tmpTxt1.slice(0, 5)+'…'
				tableplane.tr.cells[6].innerHTML = '<span class="tableAcName">' + tmpTxt1 + '</span>';

				tableplane.tr.cells[7].textContent = (tableplane.ac_category !== null ? tableplane.ac_category : "");
				tableplane.tr.cells[8].textContent = (tableplane.squawk !== null ? tableplane.squawk : "");
				tableplane.tr.cells[9].innerHTML = format_altitude_brief(tableplane.altitude, tableplane.vert_rate, DisplayUnits);
				tableplane.tr.cells[10].textContent = format_speed_brief(tableplane.speed, DisplayUnits);
				tableplane.tr.cells[11].textContent = format_vert_rate_brief(tableplane.vert_rate, DisplayUnits);
				tableplane.tr.cells[12].textContent = format_distance_brief(tableplane.sitedist, DisplayUnits); // Column index change needs to be reflected above in initialize_map()
				//tableplane.tr.cells[13].textContent = format_track_brief(tableplane.track);
				tableplane.tr.cells[13].innerHTML = trackIcon(tableplane.track);
				tableplane.tr.cells[14].textContent = tableplane.messages;
				tableplane.tr.cells[15].innerHTML = (tableplane.rssi !== null ? rssiToIcon(tableplane.rssi) : "");
				tableplane.tr.cells[16].innerHTML = progressBarIcon(tableplane.seen);
				tableplane.tr.cells[17].textContent = (tableplane.position !== null ? tableplane.position[1].toFixed(4) : "");
				tableplane.tr.cells[18].textContent = (tableplane.position !== null ? tableplane.position[0].toFixed(4) : "");
				tableplane.tr.cells[19].textContent = format_data_source(tableplane.getDataSource());
				tableplane.tr.cells[20].innerHTML = getAirframesModeSLink(tableplane.icao);
				tableplane.tr.cells[21].innerHTML = getFlightAwareModeSLink(tableplane.icao, tableplane.flight);
				if (UseJetPhotosPhotoLink) {
					tableplane.tr.cells[22].innerHTML = getJetPhotosPhotoLink(tableplane.registration);
				} else {
					tableplane.tr.cells[22].innerHTML = getFlightAwarePhotoLink(tableplane.registration);
				}

				tableplane.tr.className = classes;
				$(tableplane.tr).fadeIn("300");

			} else {
				tableplane.tr.cells[3].textContent = (tableplane.registration !== null ? tableplane.registration : "");
				tableplane.tr.cells[4].textContent = (tableplane.icaotype !== null ? tableplane.icaotype : "");
				tableplane.tr.cells[5].textContent = (tableplane.squawk !== null ? tableplane.squawk : "");
				tableplane.tr.cells[6].innerHTML = format_altitude_brief(tableplane.altitude, tableplane.vert_rate, DisplayUnits);
				tableplane.tr.cells[7].textContent = format_speed_brief(tableplane.speed, DisplayUnits);
				tableplane.tr.cells[8].textContent = format_vert_rate_brief(tableplane.vert_rate, DisplayUnits);
				tableplane.tr.cells[9].textContent = format_distance_brief(tableplane.sitedist, DisplayUnits);
				tableplane.tr.cells[10].textContent = format_track_brief(tableplane.track);
				tableplane.tr.cells[11].textContent = tableplane.messages;
				tableplane.tr.cells[12].textContent = tableplane.seen.toFixed(0);
				tableplane.tr.cells[13].textContent = (tableplane.rssi !== null ? tableplane.rssi : "");
				tableplane.tr.cells[14].textContent = (tableplane.position !== null ? tableplane.position[1].toFixed(4) : "");
				tableplane.tr.cells[15].textContent = (tableplane.position !== null ? tableplane.position[0].toFixed(4) : "");
				tableplane.tr.cells[16].textContent = format_data_source(tableplane.getDataSource());
				tableplane.tr.cells[17].innerHTML = getAirframesModeSLink(tableplane.icao);
				tableplane.tr.cells[18].innerHTML = getFlightAwareModeSLink(tableplane.icao, tableplane.flight);
				if (UseJetPhotosPhotoLink) {
					tableplane.tr.cells[19].innerHTML = getJetPhotosPhotoLink(tableplane.registration);
				} else {
					tableplane.tr.cells[19].innerHTML = getFlightAwarePhotoLink(tableplane.registration);
				}
				tableplane.tr.className = classes;
				$(tableplane.tr).fadeIn("200");
			}
		}
	}

	if (show_squawk_warning) {
		$("#SpecialSquawkWarning").css('display', 'block');
	} else {
		$("#SpecialSquawkWarning").css('display', 'none');
	}
	resortTable();
	drawRangePlot();
}

function drawBlindCone() {
	var coords = [[SiteLon, SiteLat - 1.5], [SiteLon, SiteLat], [SiteLon, SiteLat + 1.5]];
	var bcline = new ol.geom.LineString(coords);
	//var coordsHalfWay = bcline.getCoordinateAt(0.5);

	bcline.rotate((-BlindCone * (Math.PI / 180)).toFixed(4), [SiteLon, SiteLat]);
	bcline.transform('EPSG:4326', 'EPSG:3857');

	var lineStyle = new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: '#0187867a',
			width: 1,
			lineDash: [5, 3]
		})
	});

	var feature = new ol.Feature({
		geometry: bcline,
		name: 'blindConeLine',
	});

	feature.setStyle(lineStyle);
	StaticFeatures.push(feature);
}

if (BlindCone) {
	drawBlindCone();
}

// AKISSACK - Range Plot Ref: AK8E
function drawRangePlot() {

	MaxRangeFeatures.clear();

	// MAXIMUM ------------------------------------
	var style = new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: MaxRangePlot[1],
			width: MaxRangePlot[2],
		}),
		fill: new ol.style.Fill({
			color: MaxRangePlot[3]
		})
	});

	var polyCoords = [];
	for (var i = 0; i < 360; i++) {
		polyCoords.push(ol.proj.transform([MaxRngLon[i], MaxRngLat[i]], 'EPSG:4326', 'EPSG:3857'));
	}
	var rangeFeature = new ol.Feature({
		geometry: new ol.geom.Polygon([polyCoords])

	})
	rangeFeature.setStyle(style)
	if (MaxRangePlot[0]) {
		MaxRangeFeatures.push(rangeFeature)
	};

	// MEDIUM ------------------------------------
	var style = new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'rgba(0,128,0, 0.5)',
			width: MaxRangePlot[2]
		}),
		fill: new ol.style.Fill({
			color: 'rgba(0,255,0, 0.05)'
		})
	});
	var polyCoords = [];
	for (var i = 0; i < 360; i++) {
		polyCoords.push(ol.proj.transform([MidRngLon[i], MidRngLat[i]], 'EPSG:4326', 'EPSG:3857'));
	}
	var rangeFeature = new ol.Feature({
		geometry: new ol.geom.Polygon([polyCoords])

	})
	rangeFeature.setStyle(style)
	if (MidRangeHeight > 0) {
		MaxRangeFeatures.push(rangeFeature)
	}; // Medium range

	// MINIMUM ------------------------------------
	var style = new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'rgba(128,0,0, 0.5)',
			width: MaxRangePlot[2]
		}),
		fill: new ol.style.Fill({
			color: 'rgba(255,0,0, 0.05)'
		})
	});
	var polyCoords = [];
	for (var i = 0; i < 360; i++) {
		polyCoords.push(ol.proj.transform([MinRngLon[i], MinRngLat[i]], 'EPSG:4326', 'EPSG:3857'));
	}
	var rangeFeature = new ol.Feature({
		geometry: new ol.geom.Polygon([polyCoords])

	})
	rangeFeature.setStyle(style)
	if (MinRangeHeight > 0) {
		MaxRangeFeatures.push(rangeFeature);
	} // Minimum range
}

//
// ---- table sorting ----
//

function compareAlpha(xa, ya) {
	if (xa === ya)
		return 0;
	if (xa < ya)
		return -1;
	return 1;
}

function compareNumeric(xf, yf) {
	if (Math.abs(xf - yf) < 1e-9)
		return 0;

	return xf - yf;
}

function sortByICAO() {
	sortBy('icao', compareAlpha, function(x) {
		return x.icao;
	});
}

function sortByFlight() {
	sortBy('flight', compareAlpha, function(x) {
		return x.flight;
	});
}

function sortByRegistration() {
	sortBy('registration', compareAlpha, function(x) {
		return x.registration;
	});
}

function sortByAircraftType() {
	sortBy('icaotype', compareAlpha, function(x) {
		return x.icaotype;
	});
}

function sortBySquawk() {
	sortBy('squawk', compareAlpha, function(x) {
		return x.squawk;
	});
}

function sortByAltitude() {
	sortBy('altitude', compareNumeric, function(x) {
		return (x.altitude == "ground" ? -1e9 : x.altitude);
	});
}

function sortBySpeed() {
	sortBy('speed', compareNumeric, function(x) {
		return x.speed;
	});
}

function sortByVerticalRate() {
	sortBy('vert_rate', compareNumeric, function(x) {
		return x.vert_rate;
	});
}

function sortByDistance() { // AKISSACK - Order by distance, but show interesting aircraft first in the table  ------------ Ref: AK9F
	if (ShowMyPreferences) {
		sortBy('sitedist', compareNumeric, function(x) {
			//return (x.is_interesting == 'Y' ? (x.sitedist + 0) : (x.sitedist == null ? null : (x.sitedist + 1000000)));
			return x.sitedist;
		});
	} else {
		sortBy('sitedist', compareNumeric, function(x) {
			return x.sitedist;
		});
	}
}

function sortByTrack() {
	sortBy('track', compareNumeric, function(x) {
		return x.track;
	});
}

function sortByMsgs() {
	sortBy('msgs', compareNumeric, function(x) {
		return x.messages;
	});
}

function sortBySeen() {
	sortBy('seen', compareNumeric, function(x) {
		return x.seen;
	});
}

function sortByCountry() {
	sortBy('country', compareAlpha, function(x) {
		return x.icaorange.country;
	});
}

function sortByRssi() {
	sortBy('rssi', compareNumeric, function(x) {
		return x.rssi
	});
}

function sortByLatitude() {
	sortBy('lat', compareNumeric, function(x) {
		return (x.position !== null ? x.position[1] : null)
	});
}

function sortByLongitude() {
	sortBy('lon', compareNumeric, function(x) {
		return (x.position !== null ? x.position[0] : null)
	});
}

function sortByDataSource() {
	sortBy('data_source', compareAlpha, function(x) {
		return x.getDataSource()
	});
}

var sortId = '';
var sortCompare = null;
var sortExtract = null;
var sortAscending = true;

function sortFunction(x, y) {
	var xv = x._sort_value;
	var yv = y._sort_value;

	// always sort missing values at the end, regardless of
	// ascending/descending sort
	if (xv == null && yv == null) return x._sort_pos - y._sort_pos;
	if (xv == null) return 1;
	if (yv == null) return -1;

	var c = sortAscending ? sortCompare(xv, yv) : sortCompare(yv, xv);
	if (c !== 0) return c;

	return x._sort_pos - y._sort_pos;
}

function resortTable() {
	// number the existing rows so we can do a stable sort
	// regardless of whether sort() is stable or not.
	// Also extract the sort comparison value.
	for (var i = 0; i < PlanesOrdered.length; ++i) {
		PlanesOrdered[i]._sort_pos = i;
		PlanesOrdered[i]._sort_value = sortExtract(PlanesOrdered[i]);
	}

	PlanesOrdered.sort(sortFunction);

	var tbody = document.getElementById('tableinfo').tBodies[0];
	for (var i = 0; i < PlanesOrdered.length; ++i) {
		tbody.appendChild(PlanesOrdered[i].tr);
	}
}

function sortBy(id, sc, se) {
	if (id === sortId) {
		sortAscending = !sortAscending;
		PlanesOrdered.reverse(); // this correctly flips the order of rows that compare equal
	} else {
		sortAscending = true;
	}

	sortId = id;
	sortCompare = sc;
	sortExtract = se;

	resortTable();
}

function selectPlaneByHex(hex, autofollow) {
	//console.log("select: " + hex);
	// If SelectedPlane has something in it, clear out the selected

	if (SelectedAllPlanes) {
		deselectAllPlanes();
	}

	// -------------------------------------------------------------------
	// AKISSACK - Allow multiple selections                         [MLTI]
	// -------------------------------------------------------------------
	//if (SelectedPlane != null) {
	//	Planes[SelectedPlane].selected = false;
	//	Planes[SelectedPlane].clearLines();
	//	Planes[SelectedPlane].updateMarker();
	//        $(Planes[SelectedPlane].tr).removeClass("selected");
	//}
	// -------------------------------------------------------------------
	// ------------------------------------------------------- AKISSACK
	// -------------------------------------------------------------------


	// If we are clicking the same plane, we are deselecting it.
	// (unless it was a doubleclick..)
	if (SelectedPlane === hex && !autofollow) {
		hex = null;
	}

	if (hex !== null) {
		// Assign the new selected
		SelectedPlane = hex;
		Planes[SelectedPlane].selected = true;
		Planes[SelectedPlane].updateLines();
		Planes[SelectedPlane].updateMarker();
		$(Planes[SelectedPlane].tr).addClass("selected");
		getPlaneSpottersApiData(hex);
		getVariousLinksFlight();
	} else {
		SelectedPlane = null;
	}

	if (SelectedPlane !== null && autofollow) {
		FollowSelected = true;
		if (OLMap.getView().getZoom() <= 8)
			mapAnimateToCoord(Planes[SelectedPlane].position, 13, true);
	} else {
		FollowSelected = false;
	}

	refreshSelected();
}

// loop through the planes and mark them as selected to show the paths for all planes
function selectAllPlanes() {
	// if all planes are already selected, deselect them all
	if (SelectedAllPlanes) {
		deselectAllPlanes();
	} else {
		// If SelectedPlane has something in it, clear out the selected
		if (SelectedPlane != null) {
			Planes[SelectedPlane].selected = false;
			Planes[SelectedPlane].clearLines();
			Planes[SelectedPlane].updateMarker();
			$(Planes[SelectedPlane].tr).removeClass("selected");
		}

		SelectedPlane = null;
		SelectedAllPlanes = true;

		for (var key in Planes) {
			if (Planes[key].visible && !Planes[key].isFiltered()) {
				Planes[key].selected = true;
				Planes[key].updateLines();
				Planes[key].updateMarker();
			}
		}
	}

	refreshSelected();
}

// AKISSACK --------------- Ref: AK9G
function selectMilPlanes() {
	// if mil planes are already selected, deselect them all
	if (SelectedMilPlanes) {
		deselectMilPlanes();
	} else {
		// If SelectedPlane has something in it, clear out the selected
		if (SelectedPlane != null) {
			Planes[SelectedPlane].selected = false;
			Planes[SelectedPlane].clearLines();
			Planes[SelectedPlane].updateMarker();
			$(Planes[SelectedPlane].tr).removeClass("selected");
		}

		SelectedPlane = null;
		SelectedMilPlanes = true;

		for (var key in Planes) {
			if (Planes[key].visible && !Planes[key].isFiltered() && Planes[key].my_trail) {
				Planes[key].selected = true;
				Planes[key].updateLines();
				Planes[key].updateMarker();
			}
		}
	}
	refreshSelected();
}

// deselect all the mil' planes
function deselectMilPlanes() {
	for (var key in Planes) {
		Planes[key].selected = false;
		Planes[key].clearLines();
		Planes[key].updateMarker();
		$(Planes[key].tr).removeClass("selected");
	}
	SelectedPlane = null;
	SelectedMilPlanes = false;
	refreshSelected();
}

// on refreshes, try to find new planes and mark them as selected
function selectNewPlanes() {
	if (SelectedAllPlanes) {
		for (var key in Planes) {
			if (!Planes[key].visible || Planes[key].isFiltered()) {
				Planes[key].selected = false;
				Planes[key].clearLines();
				Planes[key].updateMarker();
			} else {
				if (Planes[key].selected !== true) {
					Planes[key].selected = true;
					Planes[key].updateLines();
					Planes[key].updateMarker();
				}
			}
		}
	}
}

// deselect all the planes
function deselectAllPlanes() {
	for (var key in Planes) {
		Planes[key].selected = false;
		Planes[key].clearLines();
		Planes[key].updateMarker();
		$(Planes[key].tr).removeClass("selected");
	}
	SelectedPlane = null;
	SelectedAllPlanes = false;
	refreshSelected();
}

function mapAnimateToCoord(coord, zoomFact, zoomOut) {

	var fromLonLat = ol.proj.fromLonLat;
	var coord = fromLonLat(coord);
	var easeOut = ol.easing.easeOut;
	var easeIn = ol.easing.easeIn;

	const duration = 800;
	const zoom = OLMap.getView().getZoom();
	let parts = 2;
	let called = false;

	function callback(complete) {
		--parts;
		if (called) {
			return;
		}
		if (parts === 0 || !complete) {
			called = true;
			done(complete);
		}
	}

	OLMap.getView().animate({
			center: coord,
			zoom: zoomFact,
			duration: duration,
			easing: easeOut
		},
		callback
	);

	if (zoomOut) {
		OLMap.getView().animate({
				zoom: zoom - 1,
				duration: duration / 2,
				easing: easeIn
			}, {
				zoom: zoom,
				duration: duration / 2,
				easing: easeOut
			},
			callback
		);
	} else {
		OLMap.getView().animate({
				duration: duration / 2,
			}, {
				duration: duration / 2,
			},
			callback
		);
	}

	function done() {
		if (typeof Planes[SelectedPlane] !== 'undefined') {
			if (Planes[SelectedPlane].seen_pos <= 30) {
				FollowSelected = true;
				zoomOut = false;
			} else {
				toggleFollowSelected();
			}
		}
		OLMap.getView().setZoom(zoomFact);
	}
}

function toggleFollowSelected() {

	FollowSelected = !FollowSelected;

	if (FollowSelected) {
		$('#selected_follow').html('<span title="Stop following"><i icon-name="locate-off"></i></span>');
		lucide.createIcons();
	} else {
		$('#selected_follow').html('<span title="Locate on map and follow"><i icon-name="locate-fixed"></i></span>');
		lucide.createIcons();
	}

	if (FollowSelected && OLMap.getView().getZoom() <= 8) {
		mapAnimateToCoord(Planes[SelectedPlane].position, 12, true);
	}
}

function resetMap() {
	// Reset localStorage values and map settings
	localStorage['CenterLat'] = CenterLat = DefaultCenterLat;
	localStorage['CenterLon'] = CenterLon = DefaultCenterLon;
	localStorage['ZoomLvl'] = ZoomLvl = DefaultZoomLvl;

	// Set and refresh
	FollowSelected = false;
	mapAnimateToCoord([CenterLon, CenterLat], ZoomLvl, true);
	selectPlaneByHex(null, false);
}

function resetRangePlot() {
	for (var j = 0; j < 360; j++) {
		MaxRngRange[j] = 0;
		MaxRngLat[j] = SiteLat;
		MaxRngLon[j] = SiteLon;
		MidRngRange[j] = MaxRngRange[j]
		MidRngLat[j] = MaxRngLat[j]
		MidRngLon[j] = MaxRngLon[j]
		MinRngRange[j] = MaxRngRange[j]
		MinRngLat[j] = MaxRngLat[j]
		MinRngLon[j] = MaxRngLon[j]
	}
}

function updateMapSize() {
	OLMap.updateSize();
}

function toggleSidebarVisibility(e) {
	e.preventDefault();
	$("#sidebar_container").toggle();
	$("#expand_sidebar_control").toggle();
	$("#toggle_sidebar_button").toggleClass("show_sidebar");
	$("#toggle_sidebar_button").toggleClass("hide_sidebar");
	updateMapSize();
}

function expandSidebar(e) {
	e.preventDefault();
	$("#map_container").hide()
	$("#toggle_sidebar_control").hide();
	$("#splitter").hide();
	$("#show_map_button").show();
	$('#dump1090_infoblock').css('display', 'block');
	$("#sidebar_container").width("100%");
	setColumnVisibility();
	setSelectedInfoBlockVisibility();
	updateMapSize();
}

function showMap() {
	$("#map_container").show()
	$("#toggle_sidebar_control").show();
	$("#splitter").show();
	$("#show_map_button").hide();
	$('#dump1090_infoblock').css('display', 'none');
	$("#sidebar_container").width("470px");
	setColumnVisibility();
	setSelectedInfoBlockVisibility();
	updateMapSize();
}

function showColumn(table, columnId, visible) {
	var index = $(columnId).index();
	if (index >= 0) {
		var cells = $(table).find("td:nth-child(" + (index + 1).toString() + ")");
		if (visible) {
			cells.show();
		} else {
			cells.hide();
		}
	}
}

function setColumnVisibility() {
	var mapIsVisible = $("#map_container").is(":visible");
	var infoTable = $("#tableinfo");

	showColumn(infoTable, "#registration", !mapIsVisible);
	if (ShowMyPreferences) {
		// AKISSACK - Adjust table columns ------------------ Ref: AK9F
		showColumn(infoTable, "#aircraft_type", !mapIsVisible);
		showColumn(infoTable, "#myAc", !mapIsVisible);
		showColumn(infoTable, "#myAcCat", !mapIsVisible);
		showColumn(infoTable, "#myAcType", !mapIsVisible);
		showColumn(infoTable, "#msgs", !mapIsVisible);
		showColumn(infoTable, "#seen", mapIsVisible);
		showColumn(infoTable, "#vert_rate", !mapIsVisible);
		showColumn(infoTable, "#rssi", mapIsVisible);
		showColumn(infoTable, "#lat", !mapIsVisible);
		showColumn(infoTable, "#lon", !mapIsVisible);
		showColumn(infoTable, "#data_source", mapIsVisible);
		showColumn(infoTable, "#airframes_mode_s_link", !mapIsVisible);
		showColumn(infoTable, "#flightaware_mode_s_link", !mapIsVisible);
		showColumn(infoTable, "#flightaware_photo_link", !mapIsVisible);
	} else {
		showColumn(infoTable, "#aircraft_type", !mapIsVisible);
		showColumn(infoTable, "#vert_rate", !mapIsVisible);
		showColumn(infoTable, "#rssi", !mapIsVisible);
		showColumn(infoTable, "#lat", !mapIsVisible);
		showColumn(infoTable, "#lon", !mapIsVisible);
		showColumn(infoTable, "#data_source", !mapIsVisible);
		showColumn(infoTable, "#airframes_mode_s_link", !mapIsVisible);
		showColumn(infoTable, "#flightaware_mode_s_link", !mapIsVisible);
		showColumn(infoTable, "#flightaware_photo_link", !mapIsVisible);
	}
}

function setSelectedInfoBlockVisibility() {
	var mapIsVisible = $("#map_container").is(":visible");
	var planeSelected = (typeof SelectedPlane !== 'undefined' && SelectedPlane != null && SelectedPlane != "ICAO");

	if (planeSelected && mapIsVisible) {
		//$('#selected_infoblock').show();
		//updateMapSize();
	} else {
		//$('#selected_infoblock').hide();
		//updateMapSize();
	}
}

function getExtent(x, y, width, height) {
	return {
		xMin: x,
		yMin: y,
		xMax: x + width - 1,
		yMax: y + height - 1,
	};
}

function isPointInsideExtent(x, y, extent) {
	return x >= extent.xMin && x <= extent.xMax && y >= extent.yMin && y <= extent.yMax;
}

function initializeUnitsSelector() {
	// Get display unit preferences from local storage
	if (!localStorage.getItem('displayUnits') || localStorage.getItem('displayUnits') != DisplayUnits) {
		localStorage['displayUnits'] = DisplayUnits;
	}
	var displayUnits = localStorage['displayUnits'];
	DisplayUnits = displayUnits;

	// Initialize drop-down
	var unitsSelector = $("#units_selector");
	unitsSelector.val(displayUnits);
	unitsSelector.on("change", onDisplayUnitsChanged);
}

function onDisplayUnitsChanged(e) {
	var displayUnits = event.target.value;
	// Save display units to local storage
	localStorage['displayUnits'] = displayUnits;
	DisplayUnits = displayUnits;

	// Update filters
	updatePlaneFilter();

	// Refresh data
	refreshTableInfo();
	refreshSelected();

	// Redraw range rings
	if (SitePosition !== null && SitePosition !== undefined && SiteCircles) {
		createSiteCircleFeatures();
	}

	// Reset map scale line units
	OLMap.getControls().forEach(function(control) {
		if (control instanceof ol.control.ScaleLine) {
			control.setUnits(displayUnits);
		}
	});
}

function onFilterByAltitude(e) {
	e.preventDefault();
	updatePlaneFilter();
	//console.log( PlaneFilter.specials);   //AKISSACK
	refreshTableInfo();

	var selectedPlane = Planes[SelectedPlane];
	if (selectedPlane !== undefined && selectedPlane !== null && selectedPlane.isFiltered()) {
		SelectedPlane = null;
		selectedPlane.selected = false;
		selectedPlane.clearLines();
		selectedPlane.updateMarker();
		refreshSelected();
	}
}

function onResetAltitudeFilter(e) {
	$("#altitude_filter_min").val("");
	$("#altitude_filter_max").val("");
	// ------------------------------------------------------------------
	// Allow filtering by special aircraft       AKISSACK Ref: AK11C -->
	// ------------------------------------------------------------------
	$("#specials_filter").prop('checked', false); //AKISSACK      // <--- ENDS


	updatePlaneFilter();
	refreshTableInfo();
}

function updatePlaneFilter() {
	var minAltitude = parseFloat($("#altitude_filter_min").val().trim());
	var maxAltitude = parseFloat($("#altitude_filter_max").val().trim());
	var specialsOnly = $("#specials_filter").is(":checked"); // Allow filtering by special aircraft       AKISSACK Ref: AK11D
	// console.log(specialsOnly );

	if (minAltitude === NaN) {
		minAltitude = -Infinity;
	}

	if (maxAltitude === NaN) {
		maxAltitude = Infinity;
	}

	PlaneFilter.specials = specialsOnly; // Allow filtering by special aircraft       AKISSACK Ref: AK11D
	PlaneFilter.minAltitude = minAltitude;
	PlaneFilter.maxAltitude = maxAltitude;
	PlaneFilter.altitudeUnits = DisplayUnits;
}

function getVariousLinksFlight() {
	if (typeof Planes[SelectedPlane] !== "undefined") {
		if (Planes[SelectedPlane].icao !== null || Planes[SelectedPlane].icao !== "") {
			$('#selected_links').css('display', 'flex');
			$('#selected_adsbexchange_link').attr('href', 'https://globe.adsbexchange.com/?icao=' + Planes[SelectedPlane].icao);
			$('#selected_planefinder_link').attr('href', 'https://planefinder.net/flight/' + Planes[SelectedPlane].flight);
			$('#selected_opensky_link').attr('href', 'https://opensky-network.org/aircraft-profile?icao24=' + Planes[SelectedPlane].icao);
			$('#selected_flightaware_link').attr('href', 'https://flightaware.com/live/flight/' + Planes[SelectedPlane].flight);
		} else {
			$('#selected_links').css('display', 'none');
		}
	}
}

function getFlightAwareModeSLink(code, ident, linkText) {
	if (code !== null && code.length > 0 && code[0] !== '~' && code !== "000000") {
		if (!linkText) {
			linkText = "FlightAware: " + code.toUpperCase();
		}

		var linkHtml = "<a target=\"_blank\" href=\"https://flightaware.com/live/modes/" + code;
		if (ident !== null && ident !== "") {
			linkHtml += "/ident/" + ident.trim();
		}
		linkHtml += "/redirect\">" + linkText + "</a>";
		return linkHtml;
	}

	return "";
}

function getFlightAwarePhotoLink(registration) {
	if (registration !== null && registration !== "") {
		return "<a target=\"_blank\" href=\"https://flightaware.com/photos/aircraft/" + registration.trim() + "\">[Photo] flightaware.com</a>";
	}

	return "";
}

function getJetPhotosPhotoLink(registration) {
	if (registration !== null && registration !== "") {
		return "<a target=\"_blank\" href=\"https://www.jetphotos.com/registration/" + registration.trim() + "\">[Photo] jetphotos.com</a>";
	}

	return "";
}

function getPlaneSpottersPhotoLink(registration) {
	if (registration !== null && registration !== "") {
		return "<a target=\"_blank\" href=\"https://www.planespotters.net/photos/reg/" + registration.trim() + "\">[Photo] planespotters.net</a>";
	}

	return "";
}

function getAirframesModeSLink(code) {
	if (code !== null && code.length > 0 && code[0] !== '~' && code !== "000000") {
		return "<a href=\"http://www.airframes.org/\" onclick=\"$('#airframes_post_icao').attr('value','" + code + "'); document.getElementById('horrible_hack').submit.call(document.getElementById('airframes_post')); return false;\">Airframes.org: " + code.toUpperCase() + "</a>";
	}

	return "";
}

function getAirframesModeSLinkIcao(code) { // AKISSACK  Ref: AK9F
	if (code !== null && code.length > 0 && code[0] !== '~' && code !== "000000") {
		return "<a href=\"http://www.airframes.org/\" onclick=\"$('#airframes_post_icao').attr('value','" + code + "'); document.getElementById('horrible_hack').submit.call(document.getElementById('airframes_post')); return false;\">" + code.toUpperCase() + "</a>";
	}
	return "";
}

function getTerrianColorByAlti(alti) {
	var s = TerrianColorByAlt.s;
	var l = TerrianColorByAlt.l;

	// find the pair of points the current altitude lies between,
	// and interpolate the hue between those points
	var hpoints = TerrianColorByAlt.h;
	var h = hpoints[0].val;
	for (var i = hpoints.length - 1; i >= 0; --i) {
		if (alti > hpoints[i].alt) {
			if (i == hpoints.length - 1) {
				h = hpoints[i].val;
			} else {
				h = hpoints[i].val + (hpoints[i + 1].val - hpoints[i].val) * (alti - hpoints[i].alt) / (hpoints[i + 1].alt - hpoints[i].alt)
			}
			break;
		}
	}

	if (h < 0) {
		h = (h % 360) + 360;
	} else if (h >= 360) {
		h = h % 360;
	}

	if (s < 5) s = 5;
	else if (s > 95) s = 95;

	if (l < 5) l = 5;
	else if (l > 95) l = 95;

	return 'hsl(' + (h / 5).toFixed(0) * 5 + ',' + (s / 5).toFixed(0) * 5 + '%,' + (l / 5).toFixed(0) * 5 + '%)'
}





function toggleOptions(elementid) {
	$("#" + elementid).slideToggle("fast");
}

//Draw rssi signal level instead of text values. Text value is served on hover.
function rssiToIcon(rssi) {
	var signal = "signal-zero";
	var rssi = Math.abs(rssi);
	var icon = '<i icon-name="wifi-off" class="rssiIndicator"></i>';

	if (rssi >= 0 && rssi <= 8) {
		signal = "signal";
	} else if (rssi >= 8 && rssi <= 15) {
		signal = "signal-high";
	} else if (rssi >= 15 && rssi <= 25) {
		signal = "signal-medium";
	} else if (rssi >= 25 && rssi < 49.5) {
		signal = "signal-low";
	} else if (rssi == 49.5) {
		signal = "wifi-off";
	}

	icon = '<span title="' + rssi + '" class="rssiIndicator"><i icon-name="' + signal + '"></i></span>';
	lucide.createIcons();
	return icon;

}

//Draw progress bar for last seen
function progressBarIcon(sec) {
	var pBar = "";
	var percent = "100";
	var sec = Math.round(sec);
	if (sec <= 60) {
		percent = 100 - Math.round(sec / 60 * 100) / 1;
	} else {
		percent = 0;
	}
	pBar = '<div class="progressBarWrapper shadow" title="' + sec + ' s"><div class="progressBar"><span class="progressBarFill" style="width: ' + percent + '%;"></span></div>';
	return pBar;
}

//Draw arrow direction for track
function trackIcon(track) {
	var trackIcon = "";
	if (track !== null) {
		trackIcon = '<div class="trackIcon" title="' + track + '°"><svg xmlns="http://www.w3.org/2000/svg" style="transform: rotate(' + track + 'deg)" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></div>';
	} else {
		trackIcon = track;
	}
	return trackIcon;
}

function sndAlert(toggle, enable, distanceFactor) {
	var audio = new Audio("assets/radar.mp3");

	if (toggle) {
		sndAlertEnabled = !sndAlertEnabled;
	} else if (enable) {
		sndAlertEnabled = true
	} else {
		sndAlertEnabled = false
	}

	if (sndAlertEnabled) {
		$('.proximityBtn').html('<i icon-name="bell-off"></i>');
		lucide.createIcons();
		if (!audio.duration > 0 && audio.paused) {
			if (!isNaN(parseFloat(distanceFactor))) {
				audio.volume = parseFloat(distanceFactor);
			}
			audio.loop = false;
			audio.play();
		}

	} else {
		sndAlertEnabled = false;
		$('.proximityBtn').html('<i icon-name="bell"></i>');
		lucide.createIcons();
	}
}

function copyToClipboard(element) {
	var $copyVal = $("<input>");
	$("body").append($copyVal);
	$copyVal.val($(element).text()).select();
	document.execCommand("copy");
	$copyVal.remove();
}



$(document).ready(function() {
	$("#mainTabs").tabs();
	$("#secTabsCharts").tabs();
	lucide.createIcons();
});
