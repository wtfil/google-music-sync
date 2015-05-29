var PlayMusic = require('playmusic');
var readline = require('readline-sync');
var fs = require('fs');
var pm = new PlayMusic();

var HOME = process.env.HOME || process.env.USERPROFILE;
var LOGIN_FILE = HOME + '/.gmsync';


function login(cb) {
	var config, loginData, email, password;

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
			fs.writeFile(LOGIN_FILE, JSON.stringify(config), function (err) {});
		}
		cb(null);
	});
}

return login(function () {
	pm.getAllTracks(function (err, playlist) {
		console.log(err);
		console.log(playlist);
	})
});
