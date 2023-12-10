"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_1 = require("socket.io");
var playerCount = 0;
var projectileCount = 0;
var playerPositions = {};
var projectilePositions = {};
var spearPositions = {};
var collidedSpearPositions = {};
var io = new socket_io_1.Server(3000, {
    cors: {
        origin: ['http://localhost:2000']
    }
});
setInterval(function () {
    for (var id in projectilePositions) {
        var curProjectile = projectilePositions[id];
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
io.on('connection', function (socket) {
    console.log(socket.id + 'connected');
    var playerId = playerCount;
    playerPositions[playerId] = { x: 500, y: 500 };
    io.to(socket.id).emit('playerData', playerPositions, playerId, collidedSpearPositions);
    io.emit('newPlayer', playerPositions[playerId], playerId);
    playerCount++;
    socket.on('updatePosition', function (pos) {
        playerPositions[playerId] = pos;
        io.emit('updatePosition', pos, playerId);
    });
    socket.on('disconnect', function () {
        console.log("Game Object ".concat(playerId, " disconnected"));
        socket.disconnect(true);
        delete playerPositions[playerId];
        io.emit('deletePlayer', playerId);
    });
    socket.on('newProjectile', function (pos, direction, playerId) {
        projectilePositions[projectileCount] = { direction: direction, pos: { x: direction === 'left' ? pos.x - 25 : pos.x + 20, y: pos.y }, startPos: pos, playerId: playerId };
        projectileCount++;
    });
    socket.on('playerHit', function (id) {
        if (playerPositions[id]) {
            delete (playerPositions[id]);
            io.emit('deletePlayer', id);
        }
    });
    socket.on('updateSpearPositions', function (playerId, spearData) {
        spearPositions[playerId] = spearData;
        socket.broadcast.emit('updateSpearPositions', playerId, spearData);
    });
    socket.on('updateCollidedSpear', function (playerId, spearData) {
        if (!collidedSpearPositions[playerId]) {
            collidedSpearPositions[playerId] = {};
        }
        collidedSpearPositions[playerId][spearData.id] = spearData;
        socket.broadcast.emit('updateCollidedSpear', playerId, spearData);
    });
});
