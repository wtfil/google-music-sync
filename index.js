#!/usr/bin/env node
var programm = require('commander');
var inquirer = require('inquirer');
var google = require('./lib/providers/google');
var actions = require('./cli-actions');

programm
	.version(require('./package').version)
	.usage('[options]')
	.option('-f, --favorites', 'show the list of favorite songs')
	.option('-p, --playlist [num]', 'show the list of songs for playlist')
	.option('-s, --search [text]', 'search')
	.option('-d, --download', 'download songs and sync with iTunes')
	.parse(process.argv);

if (programm.favorites || programm.search || programm.playlist) {
	return actions(programm);
}

google.getPlayLists(function (err, playlists) {
	if (err) {
		return console.error(err);
	}
	var playlistQ = {
		type: 'list',
		message: 'Playlist',
		name: 'playlist',
		choices: playlists.map(function (item, index) {
			return {
				name: index + '. ' + item.name,
				value: index
			};
		})
	};
	var actionQ = {
		type: 'list',
		message: 'Action',
		name: 'action',
		choices: [
			'print',
			'download'
		]
	};
	inquirer.prompt([playlistQ, actionQ], function (aswers) {
		actions({
			playlist: aswers.playlist,
			download: aswers.action === 'download'
		});
	});
});
