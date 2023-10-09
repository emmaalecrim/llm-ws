import express, { Request } from 'express';
import { RawData, WebSocket, Server as WebSocketServer } from 'ws';
// Auth and rate limiting
import jwt from 'jsonwebtoken';
import { auth, firestore as db } from './utils/firebase';
import { completionFreeTierLimiter, usageLimiter } from './utils/rate-limiting';
// Middleware 
import { authenticate, authenticateWithFirebase } from './utils/middleware/auth';
import rateLimiterMiddleware from './utils/middleware/rate-limiting';
import cors from 'cors';
// Controllers 
import completionController from './controllers/completionController';
import completionStreamController from './controllers/completionStreamController';
// Validation
import { InputData, validateInput } from './utils/schemas/completion';
// Misc 
import logger from './utils/logging';
import { config } from 'dotenv';


config();
// Default for websockets is 80 but sveltekit uses 80 and GCP exposes 8080 by default
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRATION = '2weeks';

const app = express();
// TCP PROBE
app.get('/health', (req, res) => {
  return res.status(200).send('OK');
});
app.use(express.json(), cors({
  origin: true,
}), rateLimiterMiddleware);
// Exchanges FB session token for longer lived JWT session token(not using JWT to avoid the potential leak)- you can very easily refactor this to be a user session later on
app.post('/exchange', authenticateWithFirebase, async (req, res) => {
  try {
    // @ts-ignore - uid is not a property of decoded
    const uid: string = req.claims?.uid;
    const isSub = db.collection('users').doc(uid).get()
      .then((snap) => snap.data()?.subscribed)
    // If the token is valid, use jwt to sign the uid. Sub is the standard claim for the user id and uid is a custom claim for ease. We respect the pattern.
    const token = jwt.sign({ sub: uid, uid, isSub }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    // Send it back
    return res.json({ token });
  } catch (e: any) {
    logger(`Error in /exchange: ${e.message}`, "error")
    return res.status(500).json({ error: e.message });
  }
});
// get user data for the JWT
app.get('/user', authenticate, async (req, res) => {
  try {
    // @ts-ignore - uid is not a property of decoded
    const uid: string = req.claims?.uid;
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

const server = app.listen(PORT, () => logger(`Listening on port ${PORT}`));

// WEBSOCKET UPGRADE HANDLER (https to ws upgrade) - auth control via exchange token
server.on('upgrade', async function upgrade(request: Request, socket, head) {
  socket.on('error', handleWebsocketError);
  try {
    authenticate(request, {}, () => null)

    socket.removeListener('error', handleWebsocketError);
    return wss.handleUpgrade(request, socket, head, function done(ws) {
      // @ts-ignore - claims is not a property of request
      wss.emit('connection', ws, request, request.claims);
    });
  } catch (e: any) {
    logger(`Error in https to wss upgrade: ${e.message}`, "error")
    socket.write(Buffer.from(JSON.stringify({ error: `Error in https to wss upgrade: ${e.message}` })))
    return socket.destroy()
  }
});
// WEBSOCKET SERVER - connects to express app via upgrade handler
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', function connection(ws: WebSocket, _: any, claims: jwt.JwtPayload) {
  ws.on('pong', heartbeat); // WebSocket Ping/Pong
  ws.on('message', async (rawData: RawData) => {
    const usage = claims?.isSub ?
      await usageLimiter.consume(claims?.uid) :
      await completionFreeTierLimiter.consume(claims?.uid)
    ws.send(Buffer.from(JSON.stringify({ usage })))
    try {
      if (!Buffer.isBuffer(rawData)) return ws.send(Buffer.from(JSON.stringify({ error: "Invalid input type. Expected BufferLike" })))
      // Parse and validate input
      const parsedData = JSON.parse(rawData.toString())
      const { success, data, error } = validateInput(parsedData)
      const validatedInput = data as InputData
      logger({ data, error })
      if (!success) return ws.send(Buffer.from(JSON.stringify({ error: "invalid input," + error })))
      // Move to controllers
      switch (validatedInput.mode) {
        // TODO: add metadata to the response
        case "stream":
          return completionStreamController(ws, validatedInput)
        default:
          return completionController(ws, validatedInput)
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

function heartbeat() {
  // @ts-ignore - isAlive is not a property of WebSocket
  this.isAlive = true;
}
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    // @ts-ignore - isAlive is not a property of WebSocket
    if (ws.isAlive === false) return ws.terminate();
    // @ts-ignore - isAlive is not a property of WebSocket
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);


wss.on('close', function close() {
  clearInterval(interval);
});

