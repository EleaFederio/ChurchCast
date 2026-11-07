# React + Vite

## YouVersion Bible access

Church Cast uses the YouVersion Platform API to browse Bible versions available
to the app key and fetch selected verses online. Added versions are saved as
library entries on the device; Bible text is not downloaded for offline use.

Create a root `.env` file with your YouVersion app key:

```env
APP_KEY=your-youversion-app-key
DATABASE_PATH=./data/churchcast.sqlite
```

Keep `.env` private and do not commit it. The API key is read by Electron's main
process and is not included in the renderer bundle. Bible version availability
depends on the licenses associated with the app key.

## Song database

The Electron app stores the song library in a local SQLite database using
Node's built-in `node:sqlite` module. The database and tables are created
automatically when the song library is first opened. Existing starter songs are
seeded once, and added, edited, and deleted songs are saved immediately.
Global song display settings—including font family, font size, font color, and
the number of lyric lines per slide—are stored in the same database and
restored when the app starts.

Set `DATABASE_PATH` in the root `.env` file to configure the database location.
Relative paths resolve from the project root. The example uses
`data/churchcast.sqlite`, and Git ignores the `data/` directory. When
`DATABASE_PATH` is unset, the database is stored as `churchcast.sqlite` in
Electron's per-user application data directory.

Back up this SQLite file to preserve the song library. When running the
renderer without Electron, the Songs page uses browser local storage instead.

## Media library

Uploaded JPEG, PNG, and MP4 files are saved in the Electron app's user-data
directory under `media/`, with a `library.json` index. The Media page reloads
these files when the app starts. Back up this `media/` directory to preserve
uploaded media; it is separate from the song database and is not included in
the project folder.

## Android lyrics and chords viewer

Church Cast includes a mobile-friendly musician monitor that opens in an Android
browser; it does not require installing an APK. It follows the song slide
currently projected from the song library and displays its lyrics, chords,
section, key, and tempo. Only the musician monitor shows chords; the audience
projection remains lyrics-only.

In the song details view, use **Transpose chords** to move the saved chords up
or down by one semitone, or choose a target key. Transposition updates the
song's chord lines and key in the library; lyrics projected to the audience
stay unchanged.

To use it during a service:

1. Connect the Church Cast computer and Android phone to the same Wi-Fi network.
2. Start the Vite development server with `npm run dev`, then start Church Cast
   in a second terminal with `npm run electron`.
3. In Church Cast, open the **Musician monitor** QR code in the right-hand
   sidebar using the phone's camera. Open the link in Chrome or another modern
   Android browser and leave the page open during the service.
4. In **Songs**, select a song and project one of its slides. The phone updates
   to show that slide's lyrics and chord lines. Projecting another slide updates
   the monitor; projecting non-song content clears the current song display.

Add lyrics and chords to a song in the song editor. Put each chord line directly
above the lyric line it belongs to, and use spaces to align chord names over
the lyrics. For example:

```text
[Verse 1]
G                 D
Amazing grace, how sweet the sound
C                 G
That saved a wretch like me
```

The chord viewer uses a monospaced font to preserve this spacing. Keep the
Church Cast computer running and connected to the same network: the phone
receives live updates directly from it. If the phone cannot connect, check that
both devices are on the same Wi-Fi and allow Church Cast through the computer's
private-network firewall prompt. The QR code contains a temporary pairing token;
use the code shown in Church Cast rather than sharing its link.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
