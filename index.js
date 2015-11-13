#!/usr/bin/env node
var programm = require('commander');
var ProgressBar = require('progress');
var google = require('./lib/providers/google');
var download = require('./lib/download');

programm
	.version(require('./package').version)
	.usage('[options]')
	.option('-f, --favorites', 'show the list of favorite songs')
	.option('-p, --playlist [num]', 'show the list of songs for playlist')
	.option('-s, --search [text]', 'search')
	.option('-d, --download', 'download songs and sync with iTunes')
	.parse(process.argv);

function downloadSongs(playlist, name) {
	var songs = playlist.songs || playlist;
	var bar = new ProgressBar('Downloading [:bar] :percent :etas', {
		complete: '#',
		total: songs.length,
		width: 50
	});
	bar.tick(0);
	download(songs, name || playlist.name)
		.on('item', bar.tick.bind(bar))
		.on('end', process.exit);
}

function printSongs(playlist) {
	(playlist.songs || playlist).forEach(function (item, index) {
		console.log('%s) %s — %s', index, item.artist, item.title);
	});
}

if (programm.favorites) {
	google.favorites(function (err, body) {
		if (err) {
			return console.error(err);
		}
		if (programm.download) {
			downloadSongs(body, 'favorites');
		} else {
			printSongs(body);
		}
	});
} else if (programm.playlist) {
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
} else if (programm.search) {
	google.search(programm.search, function (err, playlist) {
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

