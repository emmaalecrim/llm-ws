import express, { Request } from 'express';
import { RawData, WebSocket, Server as WebSocketServer } from 'ws';
// Auth and rate limiting
import jwt from 'jsonwebtoken';
import { checkSubscriptionStatus, getAuthUser, getUserData, saveFeedBack } from './utils/firebase';
import { completionFreeTierLimiter, usageLimiter } from './utils/rate-limiting';
// Middleware 
import { authenticate, authenticateWithFirebase } from './utils/middleware/auth';
import rateLimiterMiddleware from './utils/middleware/rate-limiting';
import cors from 'cors';
// Controllers 
import completionController from './controllers/completionController';
import completionStreamController from './controllers/completionStreamController';
// Validation & typings
import { InputData, validateInput } from './utils/schemas/completion';
import { Claims } from './utils/schemas/auth';
import { Feedback } from './utils/schemas/feedback';
// Misc 
import logger from './utils/logging';
import { config } from 'dotenv';


config();
// Default for websockets is 80 but sveltekit uses 80 and GCP exposes 8080 by default
const PORT = process.env.PORT || 8080;
const JWT_SECRET: string = process.env.JWT_SECRET || ""
const JWT_EXPIRATION = '2weeks';

const app = express();
// TCP PROBE
app.get('/health', (req, res) => {
  return res.status(200).send('OK');
});
// MIDDLEWARE
app.use(
  express.json(),
  cors({
    // TODO: Whitelist other services and truenation.ai, localhost and whatever vercel uses for dev branchea
    origin: true,
  }),
  rateLimiterMiddleware
);
// Exchanges FB session token for longer lived JWT session token(not using JWT to avoid the potential leak)- 
// you can very easily refactor this to be a user session later on
app.get('/exchange', authenticateWithFirebase, async (req, res) => {
  try {
    // @ts-ignore - claims is not a property of Request
    const uid: string = req.claims?.uid;
    const isSub = await checkSubscriptionStatus(uid)
    // If the token is valid, use jwt to sign the uid. Sub is the standard claim for the user id and uid is a custom claim for ease. We respect the pattern.
    const token = jwt.sign({ sub: uid, uid, isSub }, JWT_SECRET, { expiresIn: JWT_EXPIRATION, algorithm: 'HS512' });
    // Send it back
    return res.json({ token });
  } catch (e: any) {
    logger(`Error in /exchange: ${e.message}`, "error")
    return res.status(500).json({ error: e.message });
  }
});
// Add Auth middleware - checks for JWT and adds claims to request
app.use(authenticate);
// get user data for the JWT
app.get('/user', async (req, res) => {
  try {
    // @ts-ignore - claims is not a property of Request
    const uid: string = req.claims?.uid;
    const [user, data] = await Promise.all([
      getAuthUser(uid),
      getUserData(uid)
    ])
    // enhancement: cherry pick data to send back to prevent leaking sensitive data
    return res.json({ user, data });
  } catch (e: any) {
    logger(`Error in /exchange: ${e.message}`, "error")
    return res.status(500).json({ error: e.message });
  }
});

app.get('/usage', async (req, res) => {
  try {
    // @ts-ignore - claims is not a property of Request
    if (req.claims?.isSub) return res.json({ usage: "unlimited" });
    // @ts-ignore - claims is not a property of Request
    const usage = await completionFreeTierLimiter.get(req?.claims?.uid);
    return res.json({ usage });
  } catch (e: any) {
    logger(`Error in /usage: ${e.message}`, "error");
    return res.status(500).json({ error: e.message });
  }
});

app.post('/feedback', async (req, res) => {
  try {
    const feedback: Feedback = req.body;
    // @ts-ignore - claims is not a property of Request
    await saveFeedBack({ ...feedback, uid: req?.claims?.uid });
    // Reward free users for giving feedback
    // @ts-ignore - claims is not a property of Request
    if (!req?.claims?.isSub) await completionFreeTierLimiter.reward(req?.claims?.uid, 1);
    return res.json({ success: true });
  } catch (e: any) {
    logger(`Error in /feedback: ${e.message}`, "error");
    return res.status(500).json({ error: e.message });
  }
});

const server = app.listen(PORT, () => logger(`Listening on port ${PORT}`));

// WEBSOCKET UPGRADE HANDLER (https to ws upgrade) - auth control via exchange token, rate limited by IP until user is authenticated.
server.on('upgrade', async function upgrade(req: Request, socket, head) {
  socket.on('error', handleWebsocketError);
  try {
    const ip: string = req.socket.remoteAddress || ""
    if (!ip) throw new Error("No IP found, cant limit and wont upgrade.")
    usageLimiter.consume(ip, 1)
      .catch((e: any) => {
        logger(`Error in upgrade usage limiter: ${e.message}`, "error")
        return socket.destroy()
      });
    try {
      const token: string = req?.headers?.["sec-websocket-protocol"] || ""
      if (!token) throw new Error("No ID token provided")
      const claims = jwt.verify(token, JWT_SECRET) as Claims
      // @ts-ignore - claims is not a property of Request
      req.claims = claims
      // @ts-ignore - claims is not a property of Request
      if (!claims.isSub) req.claims.isSub = await checkSubscriptionStatus(claims.uid)
    } catch (e: any) {
      logger(`Error in upgrade auth: ${e.message}`, "error")
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return socket.destroy();
    }
    socket.removeListener('error', handleWebsocketError);
    return wss.handleUpgrade(req, socket, head, function done(ws) {
      // @ts-ignore - claims is not a property of Request
      wss.emit('connection', ws, req, req.claims);
    });
  } catch (e: any) {
    logger(`Error in https to wss upgrade: ${e.message}`, "error")
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    return socket.destroy();
  }
});
// WEBSOCKET SERVER - connects to express app via upgrade handler
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async function connection(ws: WebSocket, _: any, claims: Claims) {
  ws.on('pong', heartbeat); // WebSocket Ping/Pong
  ws.on('message', async (rawData: RawData) => {
    try {
      if (!Buffer.isBuffer(rawData)) return ws.send(Buffer.from(JSON.stringify({ error: "Invalid input type. Expected BufferLike" })))
      // Parse and validate input
      const parsedData = JSON.parse(rawData.toString())
      const { success, data, error } = validateInput(parsedData)
      const payload = data as InputData
      logger({ data, error })
      if (!success) return ws.send(Buffer.from(JSON.stringify({ error: "invalid input," + error })))
      // Move to controllers
      switch (payload.mode) {
        case "stream":
          return completionStreamController(ws, payload, claims)
        default:
          return completionController(ws, payload, claims)
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

