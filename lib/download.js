var EventEmitter = require('events').EventEmitter;
var async = require('async');
var request = require('request');
var iTunes = require('itunes-control');
var fs = require('fs');
var util = require('util');
var pathModule = require('path');
var nodeID3 = require('node-id3');
var google = require('./providers/google');

var MAX_DOWNLOADS_PER_TIME = 10;
var DOWNLOAD_DIR = process.env.HOME + '/.gmsync-cache';
var isWin = /win/.test(process.platform);

function downloadPlalist(songs, path, name) {
	var ee = new EventEmitter();
	var playlistName = 'gm-' + name;
	var downloadDir = path ?
		(path + '/' + name.replace(/[\/\\]/g, '_')).replace(/\/+/g, '/') :
		DOWNLOAD_DIR;

	function downloadSong(song, cb) {
		var filename = getFileName(song);
		var unfinishedFilename = filename + '-part';
		google.getStreamUrl(song.storeId, function (err, url) {
			request(url)
				.pipe(fs.createWriteStream(unfinishedFilename))
				.on('error', function (err) {
					console.error('Error while downloading', err)
				})
				.on('close', function () {
          downloadCover(song, function (coverPath) {
            const meta = getID3Meta(song, coverPath);
            nodeID3.write(meta, unfinishedFilename);
            fs.rename(unfinishedFilename, filename, cb);
          });
				});
		});
	}

  function downloadCover(song, callback) {
    if (!song.albumArtRef || song.albumArtRef.length === 0) {
      callback(null);
      return;
    }

    var coversDir = pathModule.resolve(downloadDir, 'covers');
    var coverPath = pathModule.resolve(coversDir, Math.round(Math.random() * 9999) + song.storeId + '-cover.jpg');

    function downloadCover() {
      request(song.albumArtRef[0])
        .pipe(fs.createWriteStream(coverPath))
        .on('error', function (err) {
          console.error('Error while downloading cover', err)
        })
        .on('close', function () {
          callback(coverPath);
        });
    }

    fs.exists(coversDir, function (err, exists) {
      if (exists) {
        downloadCover();
      } else {
        fs.mkdir(coversDir, downloadCover);
      }
    });
  }

  // Adds the song's metadata to the file in ID3 format.
  // Also adds the cover.
  function getID3Meta(song, coverPath) {
    return {
      title: song.title,
      artist: song.artist,
      album: song.album,
      composer: song.composer,
      image: coverPath
    }
  }

	function getFileName(song) {
		var title = song.title.replace(/\//g, '-').replace(/"/g, '\'');
		return util.format('%s/%s — %s.mp3', downloadDir, song.artist, title);
	}

	function task(song, cb) {
		var filename = getFileName(song);
		fs.readFile(filename, function (err) {
			function add() {
				if (isWin) {
					ee.emit('item');
					cb();
					return;
				}
				return iTunes.addToPlaylist(playlistName, filename, function (err) {
					if (err) {
						return setTimeout(add, 1000);
					}
					ee.emit('item');
					cb();
				});
			}
			if (!err) {
				return add();
			}
			downloadSong(song, function (err) {
				if (err) {
					return cb(err);
				}
				add();
			});
		});
	}

	try {
		fs.mkdirSync(downloadDir);
	} catch (e) {
		console.log(e);
		if (e.code === 'ENOENT') {
			console.error('\n\nNo such directory "%s"\n', path);
			return ee;
		}
	};

	function load() {
		async.eachLimit(songs, MAX_DOWNLOADS_PER_TIME, task, function (err) {
			if (err) {
				return console.error(err);
			}
			ee.emit('end');
		});
	}

	if (isWin) {
		load();
	} else {
		iTunes.createPlaylist(playlistName, load);
	}

	return ee;

}

module.exports = downloadPlalist;
