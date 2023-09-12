# This is not working because you need to expose DAC and API keys.
FROM node:14-alpine3.10 as ts-compiler
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM node:14-alpine3.10 as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/lib ./
RUN npm install --only=production

FROM node
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
EXPOSE 8080
CMD ["node" , "index.js"]
