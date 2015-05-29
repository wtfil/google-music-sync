var PlayMusic = require('playmusic');
/*var readline = require('readline-sync');*/
var fs = require('fs');
var pm = new PlayMusic();

var HOME = process.env.HOME || process.env.USERPROFILE;
var LOGIN_FILE = HOME + '/.gmsync';
var loged = false;

function login(cb) {
	var config, loginData, email, password;
	if (loged) {
		return cb(null);
	}

	try {
		config = fs.readFileSync(LOGIN_FILE);
		config = JSON.parse(config);
	} catch (e) {
		config = {};
	};

	if (config.gm && config.gm.token) {
		loginData = {
			masterToken: config.gm.token
		};
	} else {
		email = readline.question('Email: ');
		password = readline.question('Password (' + email + '): ', {hideEchoBack: true, mask: ''});
		loginData = {
			email: email,
			password: password
		};
	}

	pm.init(loginData, function (err, data) {
		if (err) {
			return cb(err);
		}
		if (email) {
			config.gm = {
				token: pm.getMasterToken()
			};
			fs.writeFile(LOGIN_FILE, JSON.stringify(config, null, 4), function (err) {
				if (err) {
					console.warn('Unable to update config file');
				}
			});
		}
		loged = true;
		cb(null);
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

function getPlayListsSongs(index, cb) {
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
			cb(null, items);
		});
	});
}


module.exports = {
	getPlayLists: loginWrap(getPlayLists),
	getPlayListsSongs: loginWrap(getPlayListsSongs),
	getStreamUrl: pm.getStreamUrl.bind(pm)
};
