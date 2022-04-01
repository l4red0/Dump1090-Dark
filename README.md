# Dump1090 Dark

This is fork of [alkissack's Dump1090-OpenLayers3-html](https://github.com/alkissack/Dump1090-OpenLayers3-html). For the full picture, please take a look at the documentation and repository from [alkissack's](https://github.com/alkissack/Dump1090-OpenLayers3-html), as I tend to clean up some files and comments that are unnecessary in my opinion.

### This project provides default dark theme for the dump1090 web interface. Also includes some new, ui-driven features.
##### DISCLAIMER: Please keep in mind that this is bug heavy, pre-release project with experimental features. Currently developed (and compatible) with stock pi24 dump1090-mutabily with plan to support other dump1090 versions with broader `aircraft.json` data.

## Key developments
- Eye-pleasing dark UI with animations and optimized information placement
- Upgraded main libraries including jQuery and OpenLayers
- IndexedDB as database to store interesting aircraft data and statistics (works out of the box)
- Proximity aircraft sound alert
- New dark-themed maps and map overlays (graticule and country specific for Poland)
- New, general purpose dump1090 aircraft database tools

More information on current development in [changlog](#changelog).

## Screenshot
![UI printscreen - initial release](https://github.com/l4red0/Dump1090-Dark-UI/blob/master/screen.webp?raw=true)
> UI preview (v0.16b).

## Instructions
The contents of public_html are a complete replacement to the webserver root directory on your dump1090-fa, or compatible, installation.

1. Go to your Dump1090 web directory. Usually it's in `/usr/share/dump1090`.

2. Copy and rename your existing `html` or `public_html` folder depending on which Dump1090 version are you using. e.g.
```
cp -R ./html ./html_original
```
3. Download files from this repo. e.g.
```
git clone https://github.com/l4red0/Dump1090-Dark.git
```
4. Copy this one in, and remember to rename it as original. e.g.
```
cp -R ./Dump1090-Dark/public_html ./html
```
5. Set your options in `config.js` file. Especially: `SiteLat`, `SiteLon` and `EndpointDump1090` variables. Save config file and rename it to `config.loc.js`. e.g.
```
nano ./html/config.js
```
   - And after editing the file press ctrl+O, rename file to `config.loc.js` and hit enter.

6. Clear your browser cache and re-load your Dump1090 page. Usually it's `http://<your-dump1090-ip>/dump1090/index.html`

## Changelog
**1.04.22 - v0.16b**
- added some JSON db tools
- config file: added basic validation and some minor bugfix
- readme.md: updated instructions

**28.03.22 - v0.16a**
- added copy to clipboard button for ICAO24
- added tabs to the right panel in order to handle more data and settings
- added database tab to manage and display information about local DB
- lots of minor UI changes

**27.03.22 - v0.16**
- added new map layer Graticule (gird with coordinates)
- aircraft photo preview tweaks/optimization
- added `localdb.js` - this is bigger update with initial [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) implementation. For now basic aircraft logger is added with more features on the way.
  - added [dexie](https://github.com/dexie/Dexie.js) as an framework and library for IndexedDB communication.
  - added basic feature to backup whole local database to JSON file.
  - added `dbAircraftRegister()` to log and register aircrafts to local db. Function works very similar to `sql\tools\seen-database` script form [alkissack's](https://github.com/alkissack/Dump1090-OpenLayers3-html) but doesn't require python+AMP stack to work. For now it logs unique ICAO codes along with first seen, last seen date and distinct sight counter.

	There are obvious downsides of this; data is only logged to DB with opened browser (browser tab doesn't need to be active just opened), and performance with higher data volume is also debatable. But it works 'out of the box'.

**22.03.22 - v0.15**
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

## Credits
- "Dump1090 Dark" fork by [Leszek Soltys](https://github.com/l4red0)
- Originally from: [dump1090-fa Debian/Raspbian packages](https://github.com/flightaware/dump1090) and webserver (html sub-directory) changes by [Allan Kissack](https://github.com/alkissack)
- Which is a fork of: dump1090-mutability for FlightAware's PiAware software.
