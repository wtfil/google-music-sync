var PlayMusic = require('playmusic');
var readline = require('readline-sync');
var fs = require('fs');
var pm = new PlayMusic();

var HOME = process.env.HOME || process.env.USERPROFILE;
var LOGIN_FILE = HOME + '/.gmsync';
var loged = false;

function requestPassword(cb) {
	var email = readline.question('Email: ');
	var password = readline.question('Password (' + email + '): ', {hideEchoBack: true, mask: ''});
	pm.login({
		email: email,
		password: password
	}, function (err, data) {
		if (err) {
			return cb(err);
		}
		var config = {gm: {auth: data}};
		fs.writeFileSync(LOGIN_FILE, JSON.stringify(config, null, 4));
		readFromCache(cb);
	});
}

function readFromCache(cb) {
	var config;
	try {
		config = fs.readFileSync(LOGIN_FILE);
		config = JSON.parse(config);
	} catch (e) {
		return cb(e);
	};
	if (!config.gm || !config.gm.auth) {
		return cb(new Error('No auth data'));
	}
	pm.init(config.gm.auth, cb);
}

function login(cb) {
	if (loged) {
		return cb(null);
	}
	readFromCache(function (err) {
		if (!err) {
			return cb(null);
		}
		requestPassword(function (err) {
			if (err) {
				return cb(err);
			}
			loged = true;
			cb(null);
		});
	});
}

function loginWrap(fn) {
	return function () {
		var args = arguments;
		var cb = args[args.length - 1];
		login(function (err) {
			if (err) {
				cb(err);
			}
			fn.apply(null, args);
		});
	};
}

function getPlayLists(cb) {
	pm.getPlayLists(function (err, response) {
		cb(err, !err && response.data.items);
	});
}

function getPlayListWithSongs(index, cb) {
	getPlayLists(function (err, playlists) {
		if (err) {
			return cb(err);
		}
		if (!playlists[index]) {
			return cb(new Error('No playlist with number ' + index));
		}
		var id = playlists[index].id;
		pm.getPlayListEntries(function (err, response) {
			if (err) {
				return cb(err);
			}
			var items = response.data.items
				.filter(function (item) {
					return item.playlistId === id;
				})
				.map(function (item) {
					return item.track;
				});
			var playlist = playlists[index];
			playlist.songs = items; // oh really? what about side effects?
			cb(null, playlist);
		});
	});
}

function search(text, cb) {
	pm.search(text, 20, function (err, response) {
		if (err) {
			return cb(err);
		}
		var items = response.entries
			.sort(function (a, b) {
				return a.score < b.score;
			})
			.map(function (item) {
				return item.track;
			})
			.filter(Boolean);

		cb(null, {
			name: text.toLowerCase(),
			songs: items
		});
	});
}

module.exports = {
	getPlayLists: loginWrap(getPlayLists),
	getPlayListWithSongs: loginWrap(getPlayListWithSongs),
	search: loginWrap(search),
	getStreamUrl: pm.getStreamUrl.bind(pm)
};
