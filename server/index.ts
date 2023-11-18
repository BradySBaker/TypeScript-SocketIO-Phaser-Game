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
  const newPlayer: Player = { x: 300, y: 300 };
  playerPositions.push(newPlayer);
  let playerId = playerCount;
  io.to(socket.id).emit('playerData', playerPositions, playerId);
  io.emit('newPlayer', playerPositions, playerId);
  playerCount++;

  socket.on('updatePosition', (pos: Player) => { //recieved player position and sends it to all clients
    playerPositions[playerId] = pos;
    io.emit('updatePosition', pos, playerId);
  })

});


io.on('disconnect', (userId) => {
  console.log(userId);
});
