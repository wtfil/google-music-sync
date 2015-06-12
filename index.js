#!/usr/bin/env node
var programm = require('commander');
var ProgressBar = require('progress');
var google = require('./lib/providers/google');
var download = require('./lib/download');
var iTunes = require('./lib/itunes');

programm
	.version(require('./package').version)
	.usage('[options]')
	.option('-p, --playlist [num]', 'Show playlist')
	.option('-d, --download', 'Download songs and sync with iTunes')
	.parse(process.argv);

function downloadSongs(playlist) {
	var playlistName = 'gm-' + playlist.name;
	var bar = new ProgressBar('Downloading [:bar] :percent :etas', {
		complete: '#',
		total: playlist.songs.length,
		width: 50
	});
	bar.tick(0);
	iTunes.createPlaylist(playlistName);
	download(playlist)
		.on('item', function (filename) {
			bar.tick();
			iTunes.addFilenameToPlaylist(playlistName, filename);
		})
		.on('end', process.exit);
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

