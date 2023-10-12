## Installation

First, make sure you have Node.js, gcloud, firebase-cli installed on your system.

Download or clone the repository from [https://github.com/emmaalecrim/llm-ws.git](https://github.com/emmaalecrim/llm-ws.git).

Navigate to the project folder in your terminal and run `yarn install`. This command will download and install all the dependencies listed in `package.json`.

## Commands

- `npm run lint`: Lint and fix potential issues in both JavaScript and TypeScript files.
- `npm run build`: Transpile TypeScript to JavaScript (outputs to a `dist` folder at root).
- `npm run build:watch`: Similar to `build`, but watches for changes in the TypeScript files and transpiles them on-the-fly.
- `npm run dev`: Starts the server in development mode with hot reloading enabled.
- `npm run docker:build`: Create a Docker image for the application.
- `npm run docker:run`: Run the Docker image locally on port 8080.
- `npm run deploy:build`: Build and submit the application to Google Cloud Build.
- `npm run deploy:build:prod`: Same as `deploy:build` but using the production settings.
- `npm run deploy`: Run the deploy to Google Cloud Run.
- `npm run deploy:prod`: Deploy with production settings.
- `npm run auth:refresh`: Re-authenticate Google and Firebase CLI.

- Generate keys for JWT authentication:
- `ssh-keygen -t rsa -b 4096 -m PEM -E SHA512 -f jwtRS512.key -N "" && openssl rsa -in jwtRS512.key -pubout -outform PEM -out jwtRS512.key.pub && cat jwtRS512.key && cat jwtRS512.key.pub && rm jwtRS512.key jwtRS512.key.pub`
