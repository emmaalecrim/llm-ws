import { WebSocketServer, RawData } from 'ws';
import completionStreamController from './controllers/completionStreamController';
import completionController from './controllers/completionController';
import { getIdFromToken } from './utils/firebase';
// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

const debug = process.env.DEBUG === "true";

const wss = new WebSocketServer({
  port: 8080,
});
const nonStreaming = ["suggest", "improve", "tone"]


wss.on('connection', function connection(ws) {
  // @ts-expect-error - typing bs
  ws.isAlive = true;

  ws.on('message', async (data: RawData) => {
    try {
      if (Buffer.isBuffer(data)) {
        if (data.toString() === "ping") return ws.send("pong")
        const parsedData = JSON.parse(data.toString())
        if (debug) console.debug('payload recieved:', parsedData)
        try {
          if (parsedData?.auth == "foobar") {
            console.log("authed")
          }
          else {
            const id = await getIdFromToken(parsedData?.auth)
            if (!id) ws.send(Buffer.from(JSON.stringify({ error: "invalid auth token" })))
          }

        } catch (e: any) {
          console.error('error in auth:', e.message)
          ws.send(Buffer.from(JSON.stringify({ error: e.message })))
          return ws.close()
        }
        if (nonStreaming.includes(parsedData.type)) return completionController(ws, parsedData)
        return completionStreamController(ws, parsedData)
      }
    }
    catch (e: any) {
      console.error('error in controller', e)
      ws.send(Buffer.from(JSON.stringify({ error: e.message })))
      return ws.close()
    }
  });

  ws.on('error', e => {
    console.error(e)
    ws.send(Buffer.from(JSON.stringify({ error: e.message })))
    return ws.close()
  });
});


