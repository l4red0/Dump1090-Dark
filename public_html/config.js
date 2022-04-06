	// --------------------------------------------------------
	//
	// This file is to configure the configurable settings.
	// Load this file before script.js file at gmap.html.
	//
	// --------------------------------------------------------

	// -- Title Settings --------------------------------------
	// Show number of aircraft and/or messages per second in the page title
	PlaneCountInTitle = true;
	MessageRateInTitle = true;

	// -- Output Settings -------------------------------------
	// The DisplayUnits setting controls whether nautical (ft, NM, knots),
	// metric (m, km, km/h) or imperial (ft, mi, mph) units are used in the
	// plane table and in the detailed plane info. Valid values are
	// "nautical", "metric", or "imperial".
	DisplayUnits = "metric";

	// -- Map settings ----------------------------------------
	// These settings are overridden by any position information
	// provided by dump1090 itself. All positions are in decimal
	// degrees.

	// The google maps zoom level, 0 - 16, lower is further out
	DefaultZoomLvl = 7;

	// Center marker. If dump1090 provides a receiver location,
	// that location is used and these settings are ignored.
	// *****  CHANGE THE LAT/LONG to match your location *****

	SiteShow = true; // true to show a center marker
	SiteLat = "xx.xx"; // [xx.xx] YOUR LATITUDE
	SiteLon = "yy.yy"; // [yy.yy] YOR LONGITUDE
	SiteName = "Radar"; // tooltip of the marker

	// Default center of the map.
	DefaultCenterLat = SiteLat;
	DefaultCenterLon = SiteLon;

	// -- Marker settings -------------------------------------

	// These settings control the coloring of aircraft by altitude.
	// All color values are given as Hue (0-359) / Saturation (0-100) / Lightness (0-100)
	ColorByAlt = {
		// HSL for planes with unknown altitude:
		unknown: {
			h: 0,
			s: 0,
			l: 0
		},

		// HSL for planes that are on the ground:
		ground: {
			h: 0,
			s: 0,
			l: 40
		},

		air: {
			// These define altitude-to-hue mappings
			// at particular altitudes; the hue
			// for intermediate altitudes that lie
			// between the provided altitudes is linearly
			// interpolated.
			//
			// Mappings must be provided in increasing
			// order of altitude.
			//
			// Altitudes below the first entry use the
			// hue of the first entry; altitudes above
			// the last entry use the hue of the last
			// entry.
			h: [{
					alt: 2000,
					val: 20
			}, // orange
				{
					alt: 10000,
					val: 140
			}, // light green
				{
					alt: 40000,
					val: 300
			}], // magenta
			s: 85,
			l: 50,
		},

		// Changes added to the color of the currently selected plane
		selected: {
			h: 60,
			s: +10,
			l: 0
		},

		// Changes added to the color of planes that have stale position info
		stale: {
			h: 0,
			s: 0,
			l: 55
		},

		// Changes added to the color of planes that have positions from mlat
		mlat: {
			h: 258,
			s: 100,
			l: 50
		}
	};

	// For a monochrome display try this:
	// ColorByAlt = {
	//         unknown :  { h: 0, s: 0, l: 40 },
	//         ground  :  { h: 0, s: 0, l: 30 },
	//         air :      { h: [ { alt: 0, val: 0 } ], s: 0, l: 50 },
	//         selected : { h: 0, s: 0, l: +30 },
	//         stale :    { h: 0, s: 0, l: +30 },
	//         mlat :     { h: 0, s: 0, l: -10 }
	// };

	// Outline color for aircraft icons with an ADS-B position
	OutlineADSBColor = '#1f2540';

	// Outline color for aircraft icons with a mlat position
	OutlineMlatColor = '#32bf6a';

	SiteCircles = true; // true to show circles (only shown if the center marker is shown)
	// In miles, nautical miles, or km (depending settings value 'DisplayUnits')
	SiteCirclesDistances = new Array(50, 100, 150, 200);

	// Controls page title, righthand pane when nothing is selected
	PageName = "DUMP1090";

	// Show country flags by ICAO addresses?
	ShowFlags = true;

	// Path to country flags (can be a relative or absolute URL; include a trailing /)
	FlagPath = "assets/flags-tiny/";

	// Set to true to enable the ChartBundle base layers (US coverage only)
	ChartBundleLayers = true;

	// Provide a Bing Maps API key here to enable the Bing imagery layer.
	// You can obtain a free key (with usage limits) at
	// https://www.bingmapsportal.com/ (you need a "basic key")
	//
	// Be sure to quote your key:
	//   BingMapsAPIKey = "your key here";
	//
	BingMapsAPIKey = null;


	UseDefaultTerrianRings = true; // default Terrian rings color, otherwise colored by altitude (color defined in TerrianColorByAlt)
	UseTerrianLineDash = false; // true: dashed or false: solid terrian rings
	TerrianLineWidth = 1; // line width of terrian rings
	TerrianAltitudes = [9842, 39370]; // altitudes in ft as in alt parameter TerrianColorByAlt, replace XXXXXXX with your code: sudo wget -O /usr/share/dump1090-fa/html/upintheair.json "www.heywhatsthat.com/api/upintheair.json?id=XXXXXXX&refraction=0.25&alts=3000,12000"
	TerrianColorByAlt = { // colours depending on altitude (UseDefaultTerrianRings must be false and TerrianAltitudes must be set), default same as colours of planes in air, alt in ft
		h: [{
				alt: 2000,
				val: 20
		}, // orange
			{
				alt: 10000,
				val: 140
		}, // light green
			{
				alt: 40000,
				val: 300
		}], // magenta
		s: 85,
		l: 50,
	};

	ShowSiteRingDistanceText = true; // show the distance text in site rings
	UseJetPhotosPhotoLink = true; // Use jetphotos.com instead of FlightAware for photo links

	// for this you have to change /etc/lighttpd/conf-enabled/89-dump1090-fa.conf : commenting out the filter $HTTP["url"] =~ "^/dump1090-fa/data/.*\.json$"  and always send the response header
	// maybe filter is not correct --- Help wanted
	// the last 3 lines should look like this without the //
	// #$HTTP["url"] =~ "^/dump1090-fa/data/.*\.json$" {
	//       setenv.add-response-header = ( "Access-Control-Allow-Origin" => "*" )
	// #}
	EndpointDump1090 = ""; // insert here endpoint to other computer where dump1090 is running (ex: http://192.168.1.152:8080/), leave it empty if it is running here

	// ----------------------------------------------------------------------------------------------------------------------------
	// Options to enable/disable modifications provided in Dump1090-OpenLayers3-html by Al Kissack
	// ----------------------------------------------------------------------------------------------------------------------------
	ShowMouseLatLong = true; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/1.-Mouse-position-Latitude-and-Longitude
	ShowAdditionalMaps = true; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/2.-Additional-maps
	ShowPermanentLabels = true; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/7.-Permanent-labels
	ShowHoverOverLabels = true; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/6.-Hover-over-labels

	// Show maximum range plot overlay on map. If showing ranges, set SiteLat/SiteLon as these are the zero range positions till plot is drawn
	// [enable max range plot, stroke color, stroke with, fill color]
	MaxRangePlot = [true, 'rgba(1,79,78, 1)', 1, 'rgba(1,135,134,0.07)'];

	MinRangeHeight = -1; // ft - inner range ring - Set -1 to disable
	MinRangeLikely = 170; // nm - practical max (to supress spikes from bad data)
	MidRangeHeight = -1; // ft - mid range ring - Set -1 to disable
	MidRangeLikely = 220; // nm - practical max
	MaxRangeLikely = 300; // nm - practical max
	// ----------------------------------------------------------------------------------------------------------------------------
	//           UK ONLY :
	// ----------------------------------------------------------------------------------------------------------------------------
	ShowUSLayers = false; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/3.-US-Layers
	ShowUKCivviLayers = true; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/4.-UK-Civilian-overlays
	ShowUKMilLayers = true; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/5.-UK-Military-overlays

	// ----------------------------------------------------------------------------------------------------------------------------
	//           PERSONAL OPTIONS      https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/9.-Minor-personal-preference-changes
	// ----------------------------------------------------------------------------------------------------------------------------
	ShowMyPreferences = true; // Required to enable the FOUR options below
	ShowAdditionalData = true;
	ShowMyIcons = false; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/10.-Aircraft-icon-changes
	ShowSimpleColours = false; // https://github.com/alkissack/Dump1090-OpenLayers3-html/wiki/9.-Minor-personal-preference-changes
	// ******************************************************************************
	ShowHTMLColumns = true; // *** If you turn this off, use the original-index.html file instead         ***
	// ******************************************************************************
	// ----------------------------------------------------------------------------------------------------------------------------
	//           PRIVATE OPTIONS
	// ----------------------------------------------------------------------------------------------------------------------------
	ShowMyFindsLayer = false; // Private plot (non-aircraft related)
	SleafordMySql = false; // Don't set this without reviewing the code - it is for me and a local mySql server on 192.168.1.11
	// ----------------------------------------------------------------------------------------------------------------------------

	DarkMode = true; //Enable dark scheme
	PanoramaRingsJson = false; //Terrain limit rings - see script.js. To enable provide path to "upintheair.json" file.
	OL3 = false; //set to false for experimental openlayer 6.13.0 support instead of OL3. Changes to paths of css and js required in index.xtml

	//Default false accepts int as angle eg. 40. Antenna blind cone in degrees. In case the antenna is not mounted freely (e.g. from a window of a multi-storey building) by entering the azimuth of the building wall given in degrees, you will create a line for the dark area of the antenna coverage. This is called Antenna blind cone.
	BlindCone = false;

	//[enabled, range in displayUnits] Audio proximity alert. The sound is played if aircraft position is from MLAT and its range is lower than provided in configuration. Sound volume is relative to proximity. This has to be also enabled by clicking the bell icon in settings menu.
	SndAlert = [false, 20];

	//Default 'false'. Initial IndexedDB implementation
	Localdb = false;

	if (EndpointDump1090 == "" || SiteLat == "xx.xx") {
		console.log('k');
		alert("Please edit configuration file in <config.js>.");
	}
