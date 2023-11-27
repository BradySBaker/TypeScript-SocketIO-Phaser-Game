"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
let playerCount = 0;
let projectileCount = 0;
let playerPositions = {};
let projectilePositions = {};
const io = new socket_io_1.Server(3000, {
    cors: {
        origin: ['*']
    }
});
setInterval(() => {
    for (let id in projectilePositions) {
        let curProjectile = projectilePositions[id];
        if (curProjectile.direction === 'right') {
            curProjectile.pos.x += 30;
        }
        else {
            curProjectile.pos.x -= 30;
        }
        curProjectile.pos.y += .5;
        if (curProjectile.pos.x > 1000 || curProjectile.pos.x < 0 || curProjectile.pos.y > 1000 || curProjectile.pos.y < 0) {
            io.emit('deleteProjectile', id);
            delete projectilePositions[id];
        }
    }
    io.emit('projectileData', projectilePositions);
}, 10);
io.on('connection', (socket) => {
    let playerId = playerCount;
    playerPositions[playerId] = { x: 300, y: 300 };
    io.to(socket.id).emit('playerData', playerPositions, playerId);
    io.emit('newPlayer', playerPositions, playerId);
    playerCount++;
    socket.on('updatePosition', (pos) => {
        playerPositions[playerId] = pos;
        io.emit('updatePosition', pos, playerId);
    });
    socket.on('disconnect', () => {
        console.log(`Game Object ${playerId} disconnected`);
        socket.disconnect(true);
        delete playerPositions[playerId];
        io.emit('deletePlayer', playerId);
    });
    socket.on('newProjectile', (pos, direction, playerId) => {
        projectilePositions[projectileCount] = { direction: direction, pos: { x: direction === 'left' ? pos.x - 25 : pos.x + 20, y: pos.y }, startPos: pos, playerId };
        projectileCount++;
    });
    socket.on('playerHit', (id) => {
        if (playerPositions[id]) {
            delete (playerPositions[id]);
            io.emit('deletePlayer', id);
        }
    });
});
//# sourceMappingURL=index.js.map