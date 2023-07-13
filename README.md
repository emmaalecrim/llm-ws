# Intro

This is a Node.js web service that that proxies open ai chat completions(SSE) via websockets.

### `build`

This command will compile all TypeScript (.ts) files into JavaScript using the TypeScript compiler.

```bash
yarn run build
```

### `build:watch`

This command will start the TypeScript compiler in watch mode. Any changes to your TypeScript files will trigger a recompilation.

```bash
yarn run build:watch
```

### `dev`

This command will start the application in development mode using nodemon. Nodemon will watch for any changes in your source files and automatically restart the server.

```bash
yarn run dev
```

### `docker:build`

This command will build a Docker image of the application with the tag `glasswall-ws`.

```bash
yarn run docker:build
```

### `docker:run`

This command will run the Docker image you built, mapping the container's port 8080 to your machine's port 8080.

```bash
yarn run docker:run
```

### `deploy:build`

This command will submit a build to Google Cloud Build using the configuration specified in `cloudbuild.yaml`.

```bash
yarn run deploy:build
```

### `deploy`

This command will submit a build to Google Cloud Build and then deploy the built image to Google Cloud Run.

```bash
yarn run deploy
```

### `auth:refresh`

This command will reauthenticate your Google and Firebase accounts.

```bash
yarn run auth:refresh
```
