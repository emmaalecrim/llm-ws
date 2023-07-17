import { WebSocketServer, RawData } from 'ws';
import completionStreamController from './controllers/completionStreamController';
import { getIdFromToken } from './utils/firebase';



console.debug("Server started at port 8080")

const wss = new WebSocketServer({
  port: 8080,
});


wss.on('connection', function connection(ws) {
  // @ts-expect-error - typing bs
  ws.isAlive = true;


  ws.on('open', () => {
    console.debug('connected');

  })

  ws.on('message', async (data: RawData) => {
    try {
      if (Buffer.isBuffer(data)) {
        if (data.toString() === "ping") ws.send("pong")
        else {
          var parsedData = JSON.parse(data.toString())
          console.debug('parsedData', parsedData)
          try {
            const id = await getIdFromToken(parsedData?.auth)
            if (!id) ws.send(Buffer.from(JSON.stringify({ error: "invalid auth token" })))

          } catch (e: any) {
            console.error('error in auth:', e.message)
            ws.send(Buffer.from(JSON.stringify({ error: e.message })))
            return ws.close()
          }
          return completionStreamController(ws, parsedData)
        }
      }
    }
    catch (e: any) {
      console.log('error in controller', e)
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


