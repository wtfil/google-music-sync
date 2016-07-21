var EventEmitter = require('events').EventEmitter;
var async = require('async');
var request = require('request');
var iTunes = require('itunes-control');
var fs = require('fs');
var util = require('util');
var google = require('./providers/google');

var MAX_DOWNLOADS_PER_TIME = 10;
var DOWNLOAD_DIR = process.env.HOME + '/.gmsync-cache';
var isWin = /win/.test(process.platform);

function downloadPlalist(songs, path, name) {
	var ee = new EventEmitter();
	var playlistName = 'gm-' + name;
	var downloadDir = path ?
		(path + '/' + name.replace(/\//g, '_')).replace(/\/+/g, '/') :
		DOWNLOAD_DIR;

	function downloadSong(song, cb) {
		var filename = getFileName(song);
		var unfinishedFilename = filename + '-part';
		google.getStreamUrl(song.storeId, function (err, url) {
			request(url)
				.pipe(fs.createWriteStream(unfinishedFilename))
				.on('error', function (err) {
					console.error('Error while downloading', err)
				})
				.on('close', function () {
					fs.rename(unfinishedFilename, filename, cb);
				});
		});
	}

	function getFileName(song) {
		var title = song.title.replace(/\//g, '-').replace(/"/g, '\'');
		return util.format('%s/%s — %s.mp3', downloadDir, song.artist, title);
	}

	function task(song, cb) {
		var filename = getFileName(song);
		fs.readFile(filename, function (err) {
			function add() {
				if (isWin) {
					ee.emit('item');
					cb();
					return;
				}
				return iTunes.addToPlaylist(playlistName, filename, function (err) {
					if (err) {
						return setTimeout(add, 1000);
					}
					ee.emit('item');
					cb();
				});
			}
			if (!err) {
				return add();
			}
			downloadSong(song, function (err) {
				if (err) {
					return cb(err);
				}
				add();
			});
		});
	}

	try {
		fs.mkdirSync(downloadDir);
	} catch (e) {
		console.log(e);
		if (e.code === 'ENOENT') {
			console.error('\n\nNo such directory "%s"\n', path);
			return ee;
		}
	};

	function load() {
		async.eachLimit(songs, MAX_DOWNLOADS_PER_TIME, task, function (err) {
			if (err) {
				return console.error(err);
			}
			ee.emit('end');
		});
	}

	if (isWin) {
		load();
	} else {
		iTunes.createPlaylist(playlistName, load);
	}

	return ee;

}

module.exports = downloadPlalist;
