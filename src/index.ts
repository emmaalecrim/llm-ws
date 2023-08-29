import { RawData, WebSocket, Server as WebSocketServer } from 'ws';
import completionStreamController from './controllers/completionStreamController';
import { getIdFromToken } from './utils/firebase';
import { config } from 'dotenv';
import express from 'express';
import http from 'http';
import { InputData, validateInput } from './utils/schemas/completion';

config();
const PORT = process.env.PORT || 8080;


const app = express();

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const server = http.createServer(app);

console.info(`Server started at port ${PORT}`)

const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws: WebSocket) {
  // @ts-expect-error - isAlive is not a property of WebSocket
  ws.isAlive = true;
  // @ts-expect-error - isAlive is not a property of WebSocket
  ws.on('pong', () => ws.isAlive = true); // WebSocket Ping/Pong

  ws.on('message', async (rawData: RawData) => {
    try {
      if (Buffer.isBuffer(rawData)) {
        if (rawData.toString() === "ping") {
          // @ts-expect-error - isAlive is not a property of WebSocket
          ws.isAlive = false;
          ws.ping('', false); // WebSocket Ping/Pong
          return ws.send("pong");
        }
        const parsedData = JSON.parse(rawData.toString())
        const { success, data } = validateInput(parsedData)
        console.debug('Parsed data:', data)
        if (!success) return ws.send(Buffer.from(JSON.stringify({ error: "invalid input" })))
        const validatedInput = data as InputData
        try {
          if (validatedInput.auth === process.env.AUTH_BYPASS_TOKEN) {
            console.error("AUTH BYPASS ENABLED - IF YOURE SEEING THIS IN PRODUCTION, SOMETHING IS WRONG")
          } else {
            const id = await getIdFromToken(parsedData?.auth) // Improved error handling for authentication
            if (!id) ws.send(Buffer.from(JSON.stringify({ error: "invalid auth token" })))
          }
        } catch (e: any) {
          console.error('Error in getIdFromToken:', e)
          ws.send(Buffer.from(JSON.stringify({ error: `Error in getIdFromToken: ${e.message}` })))
          return ws.close()
        }
        return completionStreamController(ws, validatedInput)
      }
    } catch (e: any) {
      console.error('Error in controller:', e)
      ws.send(Buffer.from(JSON.stringify({ error: `Error in controller: ${e.message}` })))
      return ws.close()
    }
  });

  ws.on('error', e => {
    console.error('Websocket error:', e)
    ws.send(Buffer.from(JSON.stringify({ error: `Websocket error: ${e.message}` })))
    return ws.close()
  });
});

setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (!ws.isAlive) return ws.terminate();

    ws.isAlive = false;
    ws.ping('', false);
  });
}, 30000); // 30 second interval

process.on('SIGINT', () => {
  console.info('Gracefully shutting down');
  server.close();
});

process.on('SIGTERM', () => {
  console.info('Gracefully shutting down');
  server.close();
});

server.listen(PORT);