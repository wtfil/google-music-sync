#!/usr/bin/env node
var programm = require('commander');
var request = require('request');
var fs = require('fs');
var async = require('async');
var util = require('util');
var ProgressBar = require('progress');
var google = require('./lib/providers/google');
var iTunes = require('./lib/itunes');

var DOWNLOAD_DIR = process.env.HOME + '/.gmsync-cache';

programm
	.version(require('./package').version)
	.usage('[options]')
	.option('-p, --playlist [num]', 'Show playlist')
	.option('-d, --download', 'Download songs and sync with iTunes')
	.parse(process.argv);

function getFileName(song) {
	return util.format('%s/%s — %s.mp3', DOWNLOAD_DIR, song.artist, song.title);
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

function downloadSongs(playlist, cb) {
	try {
		fs.mkdirSync(DOWNLOAD_DIR);
	} catch (e) {};
	var playlistName = 'gm-' + playlist.name;
	var bar = new ProgressBar('Downloading [:bar] :percent :etas', {
		complete: '#',
		total: playlist.songs.length,
		width: 50
	});
	iTunes.createPlaylist(playlistName);
	bar.tick(0);

	async.each(
		playlist.songs,
		function (song, cb) {
			var filename = getFileName(song);
			fs.readFile(filename, function (err) {
				if (!err) {
					iTunes.addFilenameToPlaylist(playlistName, filename, cb);
					return bar.tick();
				}
				downloadSong(song, function (err) {
					if (err) {
						return cb(err);
					}
					bar.tick();
					iTunes.addFilenameToPlaylist(playlistName, filename, cb);
				});
			});
		},
		process.exit
	);
}

function printSongs(playlist) {
	playlist.songs.forEach(function (item, index) {
		console.log('%s) %s — %s', index, item.artist, item.title);
	});
}

if (programm.playlist) {
	google.getPlayListWithSongs(programm.playlist, function (err, playlist) {
		if (err) {
			return console.error(err);
		}
		if (programm.download) {
			downloadSongs(playlist);
		} else {
			printSongs(playlist);
		}
	});
} else {
	google.getPlayLists(function (err, playlists) {
		if (err) {
			return console.error(err);
		}
		console.log('Your playlists:');
		playlists.forEach(function (item, index) {
			console.log('%s) %s', index, item.name);
		});
	});
}

