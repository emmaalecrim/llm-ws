import { WebSocketServer, RawData } from 'ws';
import ChatCompletionController from './controllers/ChatCompletionController';



console.debug("Server started at port 8080")

const wss = new WebSocketServer({
  port: 8080,
});


wss.on('connection', function connection(ws) {
  // @ts-expect-error - typing bs
  ws.isAlive = true;
  console.debug('connected');

  ws.on('message', function message(data: RawData) {
    try {
      if (Buffer.isBuffer(data)) {
        if (data.toString() === "ping") ws.send("pong")
        else {
          var parsedData = JSON.parse(data.toString())
          console.debug('parsedData', parsedData)
          ChatCompletionController(ws, parsedData)
        }
      }
    }
    catch (e: any) {
      console.log('error in controller', e)
      ws.send(Buffer.from(JSON.stringify({ error: e.message })))
    }
  });

  ws.on('error', e => {
    console.error(e)
    ws.send(Buffer.from(JSON.stringify({ error: e.message })))
  });
});


