const { mkdirSync } = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

const starterSongs = [
  { id: 'song-1', title: 'Great Are You Lord', artist: 'All Sons & Daughters' },
  { id: 'song-2', title: 'Goodness of God', artist: 'Bethel Music, Jenn Johnson' },
  { id: 'song-3', title: 'Build My Life', artist: 'Housefires' },
  { id: 'song-4', title: 'In Christ Alone', artist: 'Keith Getty & Stuart Townend' },
]

function validateSong(song) {
  const textFields = ['id', 'title', 'artist', 'composer', 'lyrics', 'key', 'tempo', 'source']
  if (
    !song ||
    typeof song !== 'object' ||
    textFields.some((field) => song[field] !== undefined && typeof song[field] !== 'string') ||
    !song.id?.trim() ||
    !song.title?.trim() ||
    !song.artist?.trim() ||
    song.id.length > 128 ||
    song.title.length > 300 ||
    song.artist.length > 300 ||
    (song.lyrics?.length || 0) > 1_000_000
  ) {
    throw new Error('Provide a valid song with a title and artist.')
  }
}

function createSongsDatabase(databasePath) {
  mkdirSync(path.dirname(databasePath), { recursive: true })
  const database = new DatabaseSync(databasePath)

  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      composer TEXT NOT NULL DEFAULT '',
      lyrics TEXT NOT NULL DEFAULT '',
      song_key TEXT NOT NULL DEFAULT '',
      tempo TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual'
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS song_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      font_family TEXT NOT NULL DEFAULT 'Arial, sans-serif',
      font_size INTEGER NOT NULL DEFAULT 64,
      font_color TEXT NOT NULL DEFAULT '#ffffff',
      lines_per_slide TEXT NOT NULL DEFAULT 'all'
    );
    INSERT OR IGNORE INTO song_settings (id) VALUES (1);
  `)

  const hasSeededSongs = database
    .prepare("SELECT value FROM app_metadata WHERE key = 'starter_songs_seeded'")
    .get()
  if (!hasSeededSongs) {
    const insertSong = database.prepare(
      'INSERT OR IGNORE INTO songs (id, title, artist) VALUES (?, ?, ?)',
    )
    database.exec('BEGIN')
    try {
      for (const song of [...starterSongs].reverse()) {
        insertSong.run(song.id, song.title, song.artist)
      }
      database
        .prepare("INSERT INTO app_metadata (key, value) VALUES ('starter_songs_seeded', 'true')")
        .run()
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }

  return {
    list() {
      return database
        .prepare(
          `SELECT id, title, artist, composer, lyrics, song_key AS "key", tempo, source
           FROM songs ORDER BY rowid DESC`,
        )
        .all()
    },
    getSettings() {
      const settings = database
        .prepare(
          `SELECT
             font_family AS fontFamily,
             font_size AS fontSize,
             font_color AS fontColor,
             lines_per_slide AS linesPerSlide
           FROM song_settings WHERE id = 1`,
        )
        .get()
      return settings
    },
    saveSettings(changes) {
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
        throw new Error('Provide valid song display settings.')
      }

      const current = this.getSettings()
      const updated = { ...current, ...changes }
      const allowedFonts = [
        'Arial, sans-serif',
        'Georgia, serif',
        "'Trebuchet MS', sans-serif",
        'Verdana, sans-serif',
        "'Courier New', monospace",
      ]
      const allowedLinesPerSlide = ['all', '2', '3', '4']
      if (
        !allowedFonts.includes(updated.fontFamily) ||
        !Number.isInteger(updated.fontSize) ||
        updated.fontSize < 24 ||
        updated.fontSize > 96 ||
        !/^#[0-9a-f]{6}$/i.test(updated.fontColor) ||
        !allowedLinesPerSlide.includes(updated.linesPerSlide)
      ) {
        throw new Error('Song display settings contain an invalid value.')
      }

      database
        .prepare(
          `UPDATE song_settings
           SET font_family = ?, font_size = ?, font_color = ?, lines_per_slide = ?
           WHERE id = 1`,
        )
        .run(updated.fontFamily, updated.fontSize, updated.fontColor, updated.linesPerSlide)
      return updated
    },
    save(song) {
      validateSong(song)
      database
        .prepare(
          `INSERT INTO songs (id, title, artist, composer, lyrics, song_key, tempo, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             artist = excluded.artist,
             composer = excluded.composer,
             lyrics = excluded.lyrics,
             song_key = excluded.song_key,
             tempo = excluded.tempo,
             source = excluded.source`,
        )
        .run(
          song.id,
          song.title.trim(),
          song.artist.trim(),
          song.composer || '',
          song.lyrics || '',
          song.key || '',
          song.tempo || '',
          song.source || 'manual',
        )
      return song
    },
    delete(songId) {
      if (typeof songId !== 'string' || !songId.trim() || songId.length > 128) {
        throw new Error('Invalid song ID.')
      }
      database.prepare('DELETE FROM songs WHERE id = ?').run(songId)
    },
    close() {
      database.close()
    },
  }
}

module.exports = { createSongsDatabase }
