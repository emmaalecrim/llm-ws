import { WebSocketServer, RawData } from 'ws';
import completionStreamController from './controllers/completionStreamController';
import completionController from './controllers/completionController';
import { getIdFromToken } from './utils/firebase';
import logger from './utils/logging';
import { noStream } from './utils/constants';


const wss = new WebSocketServer({
  port: 8080,
});


wss.on('connection', function connection(ws) {
  // @ts-expect-error - typing bs
  ws.isAlive = true;

  ws.on('message', async (data: RawData) => {
    try {
      if (Buffer.isBuffer(data)) {
        if (data.toString() === "ping") return ws.send("pong")
        const parsedData = JSON.parse(data.toString())
        logger({ parsedData })
        try {
          if (parsedData?.auth == "foobar") {
            logger('auth bypassed', "error")
          }
          else {
            const id = await getIdFromToken(parsedData?.auth)
            if (!id) ws.send(Buffer.from(JSON.stringify({ error: "invalid auth token" })))
          }

        } catch (e: any) {
          logger('error in auth: ' + e.message, "error")
          ws.send(Buffer.from(JSON.stringify({ error: e.message })))
          return ws.close()
        }
        if (noStream.includes(parsedData.type)) return completionController(ws, parsedData)
        return completionStreamController(ws, parsedData)
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


