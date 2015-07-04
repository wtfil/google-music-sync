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
			.on('error', console.error)
			.on('close', function () {
				fs.rename(unfinishedFilename, filename, cb);
			});
	});
}

function downloadPlalist(playlist) {
	var ee = new EventEmitter();
	var playlistName = 'gm-' + playlist.name;
	var songs = playlist.songs.slice();
	var chunks = [];
	while (songs.length) {
		chunks.push(songs.splice(0, MAX_DOWNLOADS_PER_TIME));
	}

	function downloadSongs(songs, cb) {
		async.each(
			songs,
			function (song, cb) {
				var filename = getFileName(song);
				fs.readFile(filename, function (err) {
					if (!err) {
						ee.emit('item');
						return iTunes.addToPlaylist(playlistName, filename, cb);
					}
					downloadSong(song, function (err) {
						if (err) {
							return cb(err);
						}
						ee.emit('item');
						iTunes.addToPlaylist(playlistName, filename, cb);
					});
				});
			},
			cb
		);
	}

	try {
		fs.mkdirSync(DOWNLOAD_DIR);
	} catch (e) {};
	iTunes.createPlaylist(playlistName);
	async.eachSeries(chunks, downloadSongs, ee.emit.bind(ee, 'end'));

	return ee;
}

module.exports = downloadPlalist;
