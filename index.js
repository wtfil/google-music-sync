var programm = require('commander');
var request = require('request');
var fs = require('fs');
var async = require('async');
var util = require('util');
var ProgressBar = require('progress');
var google = require('./lib/providers/google');
var loadSong = require('./lib/load-song');

var DOWNLOAD_DIR = process.env.HOME + '/.gmsync-cache';

programm
	.version(require('./package').version)
	.usage('[options]')
	.option('-p, --playlist [num]', 'Show playlist')
	.option('-d, --download', 'Download songs and sync with iTunes')
	.parse(process.argv);

function downloadSongs(songs, cb) {
	try {
		fs.mkdirSync(DOWNLOAD_DIR);
	} catch (e) {};
	var bar = new ProgressBar('Downloading [:bar] :percent :etas', {
		complete: '#',
		total: songs.length,
		width: 50
	});
	bar.tick(0);

	async.each(
		songs,
		function (song, cb) {
			var filename = util.format('%s/%s — %s.mp3', DOWNLOAD_DIR, song.artist, song.title);
			fs.readFile(filename, function (err) {
				if (!err) {
					return bar.tick();
				}
				google.getStreamUrl(songs[0].storeId, function (err, url) {
					if (err) {
						return cb(err);
					}
					request(url)
						.on('end', function () {
							bar.tick();
							cb();
						})
						.pipe(fs.createWriteStream(filename))
						.on('error', console.error)
				});
			});
		},
		cb
	);
}

function printSongs(songs) {
	songs.forEach(function (item, index) {
		console.log('%s) %s — %s', index, item.artist, item.title);
	});
}

if (programm.playlist) {
	google.getPlayListsSongs(programm.playlist, function (err, songs) {
		if (err) {
			return console.error(err);
		}
		if (programm.download) {
			downloadSongs(songs);
		} else {
			printSongs(songs);
		}
	});
} else {
	google.getPlayLists(function (err, playlists) {
		if (err) {
			return console.error(err);
		}
		playlists.forEach(function (item, index) {
			console.log('%s) %s', index, item.name);
		});
	});
}

