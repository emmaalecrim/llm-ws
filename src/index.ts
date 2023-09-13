import { WebSocketServer, RawData } from 'ws';
import completionStreamController from './controllers/completionStreamController';
import completionController from './controllers/completionController';
import { getIdFromToken } from './utils/firebase';
import logger from './utils/logging';
import { noStream } from './utils/constants';
// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

const debug = process.env.DEBUG === "true";


const wss = new WebSocketServer({
  port: 8080,
});


wss.on('connection', function connection(ws) {
  // @ts-expect-error - typing bs
  ws.isAlive = true;

  ws.on('message', async (rawData: RawData) => {
    try {
      if (Buffer.isBuffer(rawData)) {
        if (rawData.toString() === "ping") return ws.send("pong")
        const payload = JSON.parse(rawData.toString())
        logger({ parsedData: payload })
        try {
          if (payload?.auth == "foobar") {
            logger('auth bypassed', "error")
          }
          else {
            const id = await getIdFromToken(payload?.auth)
            if (!id) ws.send(Buffer.from(JSON.stringify({ error: "invalid auth token" })))
          }

        } catch (e: any) {
          logger('error in auth: ' + e.message, "error")
          ws.send(Buffer.from(JSON.stringify({ error: e.message })))
          return ws.close()
        }
        // TODO: switch this based on debug or payload.mode("streaming" | undefined)
        if (debug || noStream.includes(payload.type)) return completionController(ws, payload)
        return completionStreamController(ws, payload)
      }
    }
    catch (e: any) {
      logger('error in controller' + e, "error")
      ws.send(Buffer.from(JSON.stringify({ error: e.message })))
      return ws.close()
    }
  });

  ws.on('error', e => {
    logger('error in ws: ' + e, "error")
    ws.send(Buffer.from(JSON.stringify({ error: e.message })))
    return ws.close()
  });
});


