# Dump1090 Dark

This is fork of [alkissack's Dump1090-OpenLayers3-html](https://github.com/alkissack/Dump1090-OpenLayers3-html). For the full picture, please take a look at the documentation and repository from [alkissack's](https://github.com/alkissack/Dump1090-OpenLayers3-html), as I tend to clean up some files and comments that are unnecessary in my opinion.

### This project provides default dark scheme for the dump1090 web interface. Also includes some new, ui-driven features.
#### Please keep in mind that this is bug heavy, pre-release project with experimental features. Currently developed (and compatible) with stock pi24 dump1090-mutabily with plan to support other dump1090 versions with broader `aircraft.json` data.

### Changelog
<<<<<<< HEAD
**27.03.22 - v0.16**
=======
**24.03.22 - 0.16**
>>>>>>> 157c387dadbc5b5ac0bc2ded40e8d4395987c22a
- added new map layer Graticule (gird with coordinates)
- aircraft photo preview tweaks/optimization
- added `localdb.js` - this is bigger update with initial [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) implementation. For now basic aircraft logger is added with more features on the way.
  - added [dexie](https://github.com/dexie/Dexie.js) as an framework and library for IndexedDB communication.
<<<<<<< HEAD
  - added basic feature to backup whole local database to JSON file.
  - added `dbAircraftRegister()` to log and register aircrafts to local db. Function works very similar to `sql\tools\seen-database` script form [alkissack's](https://github.com/alkissack/Dump1090-OpenLayers3-html) but doesn't require python+AMP stack to work. For now it logs unique ICAO codes along with first seen, last seen date and distinct sight counter.

	There are obvious downsides of this; data is only logged to DB with opened browser (browser tab doesn't need to be active just opened), and performance with higher data volume is also debatable. But it works 'out of the box'.

**22.03.22 - v0.15**
=======
  - added basic option to backup (import/export) whole database to JSON file.
  - added `dbAircraftRegister()` to log and register aircrafts to local db. Function works very similar to `sql\tools\seen-database` script form [alkissack's](https://github.com/alkissack/Dump1090-OpenLayers3-html) but doesn't require python+AMP stack to work. For now it logs unique ICAO codes along with first seen, last seen date and distinct sight counter.
	- added new info to aircraft details table based on `dbAircraftRegister()`.

	There are obvious downsides of this; data is only logged to DB with opened browser (browser tab doesn't need to be active just opened), and performance with higher data volume is also debatable. But it works 'out of the box'.

**22.03.22 - 0.15**
>>>>>>> 157c387dadbc5b5ac0bc2ded40e8d4395987c22a
- added custom map overlays for Poland (airfields, airports, zones etc.)
- added proximity sound alert function. The sound is played if aircraft position is from MLAT and its range is lower than provided in configuration. Sound volume is relative to proximity. This has to be also enabled by clicking the bell icon in settings menu. This is initial feature with intention to be configurable by the user.

**18.03.22 - v0.14**
- added antenna blind cone feature. In case the antenna is not mounted freely (e.g. from a window of a multi-storey building) by entering the azimuth of the building wall given in degrees, you will create a line for the dark area of the antenna coverage.
- added map animation with easing in plane follow mode
- added fadein/out animations to planes table (this is not well tested yet)

**15.03.22 - v0.13**
- new style for map controls
- migration to new `layerSwitcher` module
- layers moved to layers.js and refactored
- minor UI changes

**14.03.22 - v0.12a**
- range rings rewritten to OL6
- added historical max distance

**11.03.22 - v0.12**
- redesigned aircraft detailed data window, added icons for clarity
- initial migration to openlayers 6 for webgl goodies. For now working but buggy and with regression to some features.
- added lots of minor UI changes

**09.03.22 - Initial release**
- added basic dark theme to css
- added dark/light mode switch (the light mode currently is buggy)
- added openstreetmap dark layer to map canvas
- lots of UI changes and fixes to sidebar panel
- added some graphic indicators instead of numeric to aircraft table (age, rssi)
- removed floating aircraft info window
- aircraft info window is now binded to bottom of screen
- added photo preview from planespotters.net
- jquery upgraded to latest version
- added lucide icon library

![UI printscreen - initial release](https://github.com/l4red0/Dump1090-Dark-UI/blob/master/screen.webp?raw=true)
> UI preview (v0.14).

**Quote from original project description**
> Modifications to the OL3 html files (part of the dump1090-fa branch). The contents of public_html are a complete replacement to the webserver root directory on your dump1090-fa, or compatible, installation. Better to rename your existing html folder, and copy this one in (calling it as per the orignal). Set your options at the bottom of config.js, clear your browser cache and re-load your dump1090-fa page.
