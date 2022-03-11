// -*- mode: javascript; indent-tabs-mode: nil; c-basic-offset: 8 -*-
"use strict";

// Base layers configuration
function createBaseLayers() {
	var layers = [];

	var world = [];
	var us = [];

	// DarkMode for OpenStreetMap
	world.push(new ol.layer.Tile({
		source: new ol.source.OSM({
			"url": "http://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
		}),
		name: 'osm dark',
		title: 'OpenStreetMap Dark',
		type: 'base',
	}));


	// ------------------------------------------------------------
	// AKISSACK - DEFAULT MAPS ------------------- ref: AK2A starts
	// ------------------------------------------------------------
	if (ShowAdditionalMaps) {
		world.push(new ol.layer.Tile({
			source: new ol.source.OSM({
				"url": "http://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
			}),
			name: 'osm light',
			title: 'OpenStreetMap Light',
			type: 'base',
		}));
	}


	// ------------------------------------------------------------
	// ---------------------------------------------- ref: AK2A ends
	// ------------------------------------------------------------

	world.push(new ol.layer.Tile({
		source: new ol.source.OSM(),
		name: 'osm',
		title: 'OpenStreetMap',
		type: 'base',
	}));

	// ------------------------------------------------------------
	// AKISSACK - additional MAPS ---------------- ref: AK2B starts
	// ------------------------------------------------------------
	if (ShowAdditionalMaps) {
		world.push(new ol.layer.Tile({
			source: new ol.source.OSM({
				"url": "http://{a-d}.tile.stamen.com/terrain/{z}/{x}/{y}.png",
				"attributions": 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ' +
					'Data by <a _href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
			}),
			name: 'terrain',
			title: 'Terrain + Roads',
			type: 'base',
		}));

		world.push(new ol.layer.Tile({
			source: new ol.source.OSM({
				"url": "http://{a-d}.tile.stamen.com/terrain-background/{z}/{x}/{y}.png",
				"attributions": 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ' +
					'Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
			}),
			name: 'terrain',
			title: 'Terrain',
			type: 'base',
		}));

	}
	// ------------------------------------------------------------
	// ---------------------------------------------- ref: AK2B ends
	// ------------------------------------------------------------

	if (BingMapsAPIKey) {
		world.push(new ol.layer.Tile({
			source: new ol.source.BingMaps({
				key: BingMapsAPIKey,
				imagerySet: 'Aerial'
			}),
			name: 'bing_aerial',
			title: 'Bing Aerial',
			type: 'base',
		}));
		world.push(new ol.layer.Tile({
			source: new ol.source.BingMaps({
				key: BingMapsAPIKey,
				imagerySet: 'Road'
			}),
			name: 'bing_roads',
			title: 'Bing Roads',
			type: 'base',
		}));
	}


	// ------------------------------------------------------------
	// AKISSACK - US Layers ---------------------- ref: AK3A starts
	// ------------------------------------------------------------

	if (ShowUSLayers) {

		if (ChartBundleLayers) {
			var chartbundleTypes = {
				sec: "Sectional Charts",
				tac: "Terminal Area Charts",
				wac: "World Aeronautical Charts",
				enrl: "IFR Enroute Low Charts",
				enra: "IFR Area Charts",
				enrh: "IFR Enroute High Charts"
			};

			for (var type in chartbundleTypes) {
				us.push(new ol.layer.Tile({
					source: new ol.source.TileWMS({
						url: 'http://wms.chartbundle.com/wms',
						params: {
							LAYERS: type
						},
						projection: 'EPSG:3857',
						attributions: 'Tiles courtesy of <a href="http://www.chartbundle.com/">ChartBundle</a>'
					}),
					name: 'chartbundle_' + type,
					title: chartbundleTypes[type],
					type: 'base',
					group: 'chartbundle'
				}));
			}
		}


		var nexrad = new ol.layer.Tile({
			name: 'nexrad',
			title: 'NEXRAD',
			type: 'overlay',
			opacity: 0.5,
			visible: false
		});
		us.push(nexrad);

		var refreshNexrad = function() {
			// re-build the source to force a refresh of the nexrad tiles
			var now = new Date().getTime();
			nexrad.setSource(new ol.source.XYZ({
				url: 'http://mesonet{1-3}.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png?_=' + now,
				attributions: 'NEXRAD courtesy of <a href="http://mesonet.agron.iastate.edu/">IEM</a>'
			}));
		};

		refreshNexrad();
		window.setInterval(refreshNexrad, 5 * 60000);

	}
	// ------------------------------------------------------------
	// AKISSACK - US Layers ---------------------- ref: AK3A ends
	// ------------------------------------------------------------

	if (world.length > 0) {
		layers.push(new ol.layer.Group({
			name: 'world',
			title: 'Worldwide',
			layers: world
		}));
	}

	if (us.length > 0) {
		layers.push(new ol.layer.Group({
			name: 'us',
			title: 'US',
			layers: us
		}));
	}

	return layers;
}
