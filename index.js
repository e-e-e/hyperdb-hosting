#!/usr/bin/env node
process.title = 'hyperdb-hosting'

const fs = require('fs')
const path = require('path')
const readFile = require('read-file-live')
const hyperdb = require('hyperdb')
const swarm = require('hyperdiscovery')
const minimist = require('minimist')

const argv = minimist(process.argv.slice(2))
const cwd = argv.cwd || process.cwd()
const dbs = {}
const ARCHIVE_DIR = 'hyperdb-archive'

if (argv.help) {
  console.log(
    'Usage: hyperdb-hosting [options]\n\n' +
    '  --cwd         [folder to run in]\n'
  )
  process.exit(0)
}

function loadDb (key) {
  console.log('Loading', key)
  try {
    fs.mkdirSync(cwd, ARCHIVE_DIR)
  } catch (e) {}
  const db = hyperdb(path.join(cwd, ARCHIVE_DIR, key), key)
  dbs[key] = db
  db.ready(() => {
    db.network = swarm(db, { live: true })
    // db.network.on('connection', () => {
    //   console.log('connected to', db.network.connections.length, 'peers')
    // })
  })
}

function unloadDb (key) {
  console.log('Unloading', key)
  const db = dbs[key]
  if (db.network) db.network.close()
  delete dbs[key]
}

readFile(path.join(cwd, 'hyperdb-list'), function (file) {
  const update = file.toString().trim().split('\n').filter(key => key.length === 64)
  const current = Object.keys(dbs)
  current.forEach((key) => {
    if (update.indexOf(key) >= 0) return
    unloadDb(key)
  })
  update.forEach((key) => {
    if (dbs[key]) return
    loadDb(key)
  })
})
