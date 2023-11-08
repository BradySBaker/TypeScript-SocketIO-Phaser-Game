import { Socket, Server } from 'socket.io';

let playerCount: number = 0;

type Player = {
  x: number,
  y: number
};

let playerPositions: Player[] = [];

const io = new Server(3000, {
  cors: {
    origin: ['http://localhost:2000']
  }
});

io.on('connection', (socket: Socket) => {
  const newPlayer: Player = { x: 0, y: 0 };
  playerPositions.push(newPlayer);
  let playerId = playerCount;
  io.to(socket.id).emit('playerData', playerPositions, playerId);
  io.emit('newPlayer', playerPositions, playerId);
  playerCount++;
  socket.on('updatePosition', (pos: Player) => {
    playerPositions[playerId] = pos;
    io.emit('updatePosition', pos, playerId);
  })
});


io.on('disconnect', () => {

});
//