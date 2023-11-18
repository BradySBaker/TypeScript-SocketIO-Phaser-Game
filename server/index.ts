import { Socket, Server } from 'socket.io';

let playerCount: number = 0;

type Player = {
  x: number,
  y: number,
};

let playerPositions: {[playerId: number]: Player} = {};

const io = new Server(3000, {
  cors: {
    origin: ['http://localhost:2000']
  }
});

io.on('connection', (socket: Socket) => {
  let playerId = playerCount;
  playerPositions[playerId] = {x: 300, y: 300 };
  io.to(socket.id).emit('playerData', playerPositions, playerId);
  io.emit('newPlayer', playerPositions, playerId);
  playerCount++;

  socket.on('updatePosition', (pos: Player) => { //recieved player position and sends it to all clients
    playerPositions[playerId] = pos;
    io.emit('updatePosition', pos, playerId);
  })

  socket.on('disconnect', () => {
    console.log(playerId);
  });

});

