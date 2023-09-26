import { RawData, WebSocket, Server as WebSocketServer } from 'ws';
import completionStreamController from './controllers/completionStreamController';
import completionController from './controllers/completionController';
import { getIdFromToken } from './utils/firebase';
import { config } from 'dotenv';
import express from 'express';
import http from 'http';
import { InputData, validateInput } from './utils/schemas/completion';
import logger from './utils/logging';
import jwt from 'jsonwebtoken';
import { auth, firestore as db } from './utils/firebase';


config();

const PORT = process.env.PORT || 80;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRATION = '2weeks';

const app = express();
const server = http.createServer(app);
app.use(express.json());

app.get('/health', (req, res) => {
  return res.status(200).send('OK');
});

// Exchanges FB session token for longer lived JWT session token(not using JWT to avoid the potential leak)- you can very easily refactor this to be a user session later on
app.post('/exchange', async (req, res) => {
  try {
    const idToken: string = req?.header('Authorization')?.split(' ')[1] || "";
    if (!idToken) throw new Error("No ID token provided")
    // Verify the ID token first.
    let decodedToken;
    try {
      decodedToken = await getIdFromToken(idToken);
    } catch (e: any) {
      logger(`Error in auth.verifyIdToken: ${e.message}`, "error")
      return res.status(401).json({ error: "Invalid ID token" });
    }
    const uid = decodedToken.uid;
    // If the token is valid, use jwt to sign the uid. Sub is the standard claim for the user id and uid is a custom claim for ease. We respect the pattern.
    const token = jwt.sign({ sub: uid, uid }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    // Send it back
    return res.json({ token });
  } catch (e: any) {
    logger(`Error in /exchange: ${e.message}`, "error")
    return res.status(500).json({ error: e.message });
  }
});

// get user data from the JWT
app.get('/user', async (req, res) => {
  try {
    const token: string = req?.header('Authorization')?.split(' ')[1] || "";
    let claims
    try {
      claims = jwt.verify(token, JWT_SECRET);
    } catch (e: any) {
      logger(`Error in jwt.verify: ${e.message}`, "error")
      return res.status(401).json({ error: "Invalid JWT" });
    }
    // @ts-ignore - uid is not a property of decoded
    const uid: string = claims?.uid;
    const [user, data] = await Promise.all([
      auth.getUser(uid).catch((e) => logger(`Error in auth.getUser: ${e.message}`, "error")),
      db.collection('users').doc(uid).get().then((snap) => snap.data).catch((e) => logger(`Error in db.collection('users').doc(${uid}).get(): ${e.message}`, "error"))
    ])
    // TODO: cherry pick data to send back to prevent leaking sensitive data
    return res.json({ user, userData: data });
  } catch (e: any) {
    logger(`Error in /exchange: ${e.message}`, "error")
    return res.status(500).json({ error: e.message });
  }
});


// WEBSOCKET UPGRADE HANDLER (https to ws upgrade) - auth control via exchange token
server.on('upgrade', async function upgrade(request, socket, head) {
  socket.on('error', handleWebsocketError);
  const { headers } = request;
  const token = headers.authorization?.split(' ')[1] || ""
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }

  try {

    const claims = jwt.verify(token, JWT_SECRET);
    // @ts-ignore - uid is not a property of decoded
    const uid: string = claims?.uid;
    if (!uid) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return socket.destroy();
    }

    socket.removeListener('error', handleWebsocketError);
    return wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } catch (e: any) {
    logger(`Error in https to wss upgrade: ${e.message}`, "error")
    socket.write(Buffer.from(JSON.stringify({ error: `Error in https to wss upgrade: ${e.message}` })))
    return socket.destroy()
  }
});

// WEBSOCKET SERVER
const wss = new WebSocketServer({ noServer: true });

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
        // DONT DO THIS; MALFORMED JSON WILL ALWAYS THROW. HANDLE IT GRACEFULLY
        const parsedData = JSON.parse(rawData.toString())
        const { success, data } = validateInput(parsedData)
        logger({ parsedData: data })
        if (!success) return ws.send(Buffer.from(JSON.stringify({ error: "invalid input" })))
        const validatedInput = data as InputData
        switch (validatedInput.mode) {
          // TODO: add metadata to the response
          case "stream":
            return completionStreamController(ws, validatedInput)
          default:
            return completionController(ws, validatedInput)
        }
      }
    } catch (e: any) {
      logger(`Error in controller: ${e.message}`, "error")
      ws.send(Buffer.from(JSON.stringify({ error: `Error in controller: ${e.message}` })))
      return ws.close()
    }
  });

  ws.on('error', handleWebsocketError);
});

const handleWebsocketError = (ws: WebSocket, e: Error) => {
  logger(`Websocket error: ${e.message}`, "error")
  ws.send(Buffer.from(JSON.stringify({ error: `Websocket error: ${e.message}` })))
  return ws.close()
}

setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (!ws.isAlive) return ws.terminate();

    ws.isAlive = false;
    ws.ping('', false);
  });
}, 30000); // 30 second interval

// PROCESS HANDLING

process.on('SIGINT', () => {
  logger('SIGINT signal received. Shutting down gracefully');
  server.close();
});

process.on('SIGTERM', () => {
  logger('SIGTERM signal received. Shutting down gracefully');
  server.close();
});

server.listen(PORT, () => logger(`Listening on port ${PORT}`));