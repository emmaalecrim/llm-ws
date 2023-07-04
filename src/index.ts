import express, { Request } from 'express';
import { WebSocketServer, RawData } from 'ws';
import { createServer } from 'http';
import ChatCompletionController from './controllers/ChatCompletionController';
import { authenticate } from './middleware/auth';



const app = express()
const server = createServer(app)

server.listen(8080)

console.debug("Server started at port 8080")

const wss = new WebSocketServer({
  noServer: true,
});

function onSocketError(err: any) {
  console.error(err);
}

server.on('upgrade', async function upgrade(request: Request, socket, head) {
  socket.on('error', onSocketError);

  await authenticate(request, function next(client: any) {
    if (!client && !!!process.env.DISABLE_AUTH) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    // @ts-expect-error - should not edit request
    request.client = client;
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  });

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


