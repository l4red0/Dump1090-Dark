#!/usr/bin/env python3

# This is based on "csv-to-json.py" ( https://github.com/alkissack/Dump1090-OpenLayers3-html/blob/master/public_html/sql/tools/create-new-database/csv-to-json.py )
# Script converts CSV aircraft data into a bunch of json files. It is compatible with tools in this directory and CSV exported from mySQL database created by this tools.
# 1. Export mySQL table to CSV. If using phpMyAdmin:
#   - Select 'export method' to custom
#	- Format to CSV
#	- Replace NULL with: "" (make this field empty)
#	- And check 'Put columns names in the first row' option
# 2. Run script with python 3 with <path to CSV> and <path to JSON output> parameters e.g "osn-csvToJson.py aircraft_icao24.csv ./db"

import sqlite3, json, sys, csv, os, html
from contextlib import closing

#how many actual rows are there
def rowscounter(name):
    file = open(name, encoding = 'UTF-8')
    lineCounter = len(file.readlines())
    return lineCounter

def noblank(fd):
    try:
        while True:
            line = next(fd)
            if len(line.strip()) != 0:
                yield line
    except:
        return

def dictFilter(it, *keys):
    for d in it:
        yield dict((k, d[k]) for k in keys)

def readcsv(name, infile, blocks):
    print('Reading from', name, file=sys.stderr)

    if len(blocks) == 0:
        for i in range(16):
            blocks['%01X' % i] = {}
    ac_count = 0
    filecsv = open(name, "r", encoding="UTF-8", errors="ignore")
    reader = csv.DictReader(filecsv)
    if not 'icao24' in reader.fieldnames:
        raise RuntimeError('CSV should have at least an "icao24" column')

    for row in dictFilter(reader,'icao24', 'country', 'image', 'interesting', 'op', 'owner', 'short', 'trail', 'type', 'airforce', 't', 'r',
    'operatoricao', 'operatorcallsign', 'built', 'm', 'icaoaircrafttype', 'serialnumber', 'registered', 'engines', 'categoryDescription', 'notes' ): #select columns you want to include in output json
        icao24 = row['icao24']
        row['Owner'] = row.pop('owner')
        row['Int'] = row.pop('interesting')
        row['Built'] = row.pop('built')
        row['Op'] = row.pop('op')
        row['Type'] = row.pop('type')
        row['Force'] = row.pop('airforce')
        row['Short'] = row.pop('short')
        row['Trail'] = row.pop('trail')
        html.unescape(row['engines'])
        html.unescape(row['notes'])

        entry = {}
        for k,v in list(row.items()):
            if k != 'icao24' and v != '':
                entry[k] = v

        if len(entry) > 0:
            ac_count += 1

            bkey = icao24[0:1].upper()
            dkey = icao24[1:].upper()
            if dkey != "" and bkey != "":
                blocks[bkey].setdefault(dkey, {}).update(entry)

    print('Read', ac_count,'aircraft out of',rowscounter(name), 'rows from', name, file=sys.stderr)

def writedb(blocks, todir, blocklimit, debug):
    block_count = 0
    os.mkdir(todir)

    print('Writing blocks:', end=' ', file=sys.stderr)

    queue = sorted(blocks.keys())
    while queue:
        bkey = queue[0]
        del queue[0]

        blockdata = blocks[bkey]
        if len(blockdata) > blocklimit:
            if debug: print('Splitting block', bkey, 'with', len(blockdata), 'entries..', end=' ', file=sys.stderr)

            # split all children out
            children = {}
            for dkey in list(blockdata.keys()):
                new_bkey = bkey + dkey[0]
                new_dkey = dkey[1:]

                if new_bkey not in children: children[new_bkey] = {}
                children[new_bkey][new_dkey] = blockdata[dkey]

            # look for small children we can retain in the parent, to
            # reduce the total number of files needed. This reduces the
            # number of blocks needed from 150 to 61
            blockdata = {}
            children = sorted(list(children.items()), key=lambda x: len(x[1]))
            retained = 1

            while len(children[0][1]) + retained < blocklimit:
                # move this child back to the parent
                c_bkey, c_entries = children[0]
                for c_dkey, entry in list(c_entries.items()):
                    blockdata[c_bkey[-1] + c_dkey] = entry
                    retained += 1
                del children[0]

            if debug: print(len(children), 'children created,', len(blockdata), 'entries retained in parent', file=sys.stderr)
            children = sorted(children, key=lambda x: x[0])
            blockdata['children'] = [x[0] for x in children]
            blocks[bkey] = blockdata
            for c_bkey, c_entries in children:
                blocks[c_bkey] = c_entries
                queue.append(c_bkey)

        path = todir + '/' + bkey + '.json'
        if debug: print('Writing', len(blockdata), 'entries to', path, file=sys.stderr)
        else: print(bkey, end=' ', file=sys.stderr)
        block_count += 1
        with closing(open(path, 'w')) as f:
            json.dump(obj=blockdata, fp=f, check_circular=False, separators=(',',':'), sort_keys=True)

    print('done.', file=sys.stderr)
    print('Wrote', block_count, 'blocks', file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Reads a CSV file with aircraft information and produces a directory of JSON files', file=sys.stderr)
        print('Syntax: %s <path to CSV> [... additional CSV files ...] <path to DB dir>' % sys.argv[0], file=sys.stderr)
        print('Use "-" as the CSV path to read from stdin', file=sys.stderr)
        print('If multiple CSV files are specified and they provide conflicting data', file=sys.stderr)
        print('then the data from the last-listed CSV file is used', file=sys.stderr)
        sys.exit(1)

    blocks = {}
    for filename in sys.argv[1:-1]:
        if filename == '-':
            readcsv('stdin', sys.stdin, blocks)
        else:
            with closing(open(filename, 'r')) as infile:
                readcsv(filename, infile, blocks)

    writedb(blocks, sys.argv[-1], 1000, False)
    sys.exit(0)
