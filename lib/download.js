var EventEmitter = require('events').EventEmitter;
var async = require('async');
var request = require('request');
var iTunes = require('itunes-control');
var fs = require('fs');
var util = require('util');
var google = require('./providers/google');

var MAX_DOWNLOADS_PER_TIME = 10;
var DOWNLOAD_DIR = process.env.HOME + '/.gmsync-cache';

function getFileName(song) {
	var title = song.title.replace(/\//g, '-');
	return util.format('%s/%s — %s.mp3', DOWNLOAD_DIR, song.artist, title);
}
function downloadSong(song, cb) {
	var filename = getFileName(song);
	var unfinishedFilename = filename + '-part';
	google.getStreamUrl(song.storeId, function (err, url) {
		request(url)
			.pipe(fs.createWriteStream(unfinishedFilename))
			.on('error', function (err) {
				console.warn('Retry:', filename);
				setTimeout(downloadSong.bind(null, song, cb), 1000);
				this.stop();
				/*console.error('Error while downloading', err)*/
			})
			.on('close', function () {
				fs.rename(unfinishedFilename, filename, cb);
			});
	});
}

function downloadPlalist(songs, name) {
	var ee = new EventEmitter();
	var playlistName = 'gm-' + name;

	function task(song, cb) {
		var filename = getFileName(song);
		fs.readFile(filename, function (err) {
			function add() {
				ee.emit('item');
				return iTunes.addToPlaylist(playlistName, filename, function (err) {
					if (err) {
						console.log(err.message);
					}
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
		fs.mkdirSync(DOWNLOAD_DIR);
	} catch (e) {};
	iTunes.createPlaylist(playlistName);

	async.eachLimit(songs, MAX_DOWNLOADS_PER_TIME, task, function (err) {
		if (err) {
			return console.error(err);
		}
		ee.emit('end');
	});
	return ee;
}

module.exports = downloadPlalist;
