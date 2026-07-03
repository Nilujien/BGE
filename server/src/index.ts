import { createServer } from 'http';
import express from 'express';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom.js';

const PORT = Number(process.env.PORT || 2567);
const app = express();
const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define('game', GameRoom);

app.use('/colyseus', monitor());

httpServer.listen(PORT, () => {
  console.log(`BGE server listening on ws://localhost:${PORT}`);
});
