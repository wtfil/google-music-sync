var programm = require('commander');
var google = require('./lib/providers/google');

programm
	.version(require('./package').version)
	.usage('[options]')
	.option('-p, --playlist [num]', 'Show playlist')
	.parse(process.argv);

if (programm.playlist) {
	google.getPlayListsSongs(programm.playlist, function (err, songs) {
		if (err) {
			return console.error(err);
		}
		songs.forEach(function (item, index) {
			console.log('%s) %s — %s', index, item.artist, item.title);
		});
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

