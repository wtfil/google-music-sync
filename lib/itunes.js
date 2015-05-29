var util = require('util');
var applescript = require('applescript');


function createPlaylist(name, cb) {
	var script = util.format(
		'tell application "iTunes" to make new user playlist with properties {name:"%s"}',
		name
	);
	applescript.execString(script, cb);
}

function addFilenameToPlaylist(playlist, filename, cb) {
	var script = util.format(
		'set foo to POSIX file "%s" as alias \n tell application "iTunes" to add foo to playlist "%s"',
		filename,
		playlist
	);
	applescript.execString(script, cb);
}

module.exports = {
	createPlaylist: createPlaylist,
	addFilenameToPlaylist: addFilenameToPlaylist
};
