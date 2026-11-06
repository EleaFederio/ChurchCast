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

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
