# google-music-sync

Sync your google music playlists to iTunes for offline listening or for future syncing with iPod

	npm install -g google-music-sync

## Usage

google-music-sync can show list of you playlists, playlist's tracks or can download that tracks for offline usage

Show your playlists:

	google-music-sync

With option `-p` or `--playlist` you can see the list of songs in playlist

	google-music-sync --playlist 2  #songs from playlist with index 2

If you want to download that songs and crate iTunes playlist with them

	google-music-sync --playlist 2 --download

It will download all songs to `~/.gmsync-cache` folder and create iTunes playlist with prefix `gm-` and name from google music
