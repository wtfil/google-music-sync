var ProgressBar = require('progress');
var google = require('./lib/providers/google');
var download = require('./lib/download');

function printSongs(songs) {
	songs.forEach(function (item, index) {
		console.log('%s. %s — %s', index, item.artist, item.title);
	});
}

function downloadSongs(songs, name) {
	var bar = new ProgressBar('Downloading [:bar] :percent :etas', {
		complete: '#',
		total: songs.length,
		width: 50
	});
	bar.tick(0);
	download(songs, name)
		.on('item', bar.tick.bind(bar))
		.on('end', process.exit);
}

module.exports = function (opts) {
	function next(err, data) {
		if (err) {
			return console.error(err);
		}
		var songs = data.songs || data;
		var name = opts.favorites ? 'favorites' : data.name;
		if (opts.download) {
			return downloadSongs(songs, name);
		}
		printSongs(songs);
	}

	if (opts.favorites) {
		google.favorites(next);
	} else if (opts.search) {
		google.search(opts.search, next);
	} else {
		google.getPlayListWithSongs(opts.playlist, next);
	}
};
