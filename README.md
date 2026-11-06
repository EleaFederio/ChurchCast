# React + Vite

## YouVersion Bible access

Church Cast uses the YouVersion Platform API to browse Bible versions available
to the app key and fetch selected verses online. Added versions are saved as
library entries on the device; Bible text is not downloaded for offline use.

Create a root `.env` file with your YouVersion app key:

```env
APP_KEY=your-youversion-app-key
```

Keep `.env` private and do not commit it. The API key is read by Electron's main
process and is not included in the renderer bundle. Bible version availability
depends on the licenses associated with the app key.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
