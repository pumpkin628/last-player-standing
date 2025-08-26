const cors = require('cors');
app.use(cors());
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(bodyParser.json());

const rooms = new Map(); // roomId → { players, started, callbackUrl }

app.post('/api/create-room', (req, res) => {
  const { roomId, players, callbackUrl } = req.body;
  if (!roomId || !players || players.length > 8) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  rooms.set(roomId, {
    players: players.map(name => ({ name, eliminated: false })),
    started: false,
    callbackUrl
  });

  res.json({ message: 'Room created', roomId });
});
app.post('/api/join-room', (req, res) => {
  const { roomId, playerName } = req.body;

  if (!roomId || !playerName) {
    return res.status(400).json({ error: 'Missing roomId or playerName' });
  }

  let room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.started) {
    return res.status(400).json({ error: 'Game already started' });
  }

  // Add player if not present
  if (!room.players.find(p => p.name === playerName)) {
    room.players.push({ name: playerName, eliminated: false });
  }

  // ✅ Emit updated player list to WebSocket clients in the room
  io.to(roomId).emit('playerList', room.players);

  res.json({
    message: 'Joined successfully',
    roomId,
    players: room.players
  });
});



io.on('connection', socket => {


  socket.on('joinRoom', ({ roomId, playerName }) => {
 let room = rooms.get(roomId);

  // ✅ Auto-create the room if it doesn't exist
  if (!room) {
    room = {
      players: [],
      started: false,
      callbackUrl: ""
    };
    rooms.set(roomId, room);
    console.log(`[AUTO-CREATED] Room ${roomId}`);
  }

  // If the game already started, block late joins
  if (room.started) return;

  // ✅ Add the player if not already in the list
  if (!room.players.find(p => p.name === playerName)) {
    room.players.push({ name: playerName, eliminated: false });
    console.log(`[JOINED] ${playerName} joined room ${roomId}`);
  }

  // Join the WebSocket room
  socket.join(roomId);
  socket.data.roomId = roomId;
  socket.data.playerName = playerName;

  // Notify everyone in the room of the updated list
  io.to(roomId).emit('playerList', room.players);
});

  socket.on('startGame', async () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.started) return;

    room.started = true;

    const interval = setInterval(() => {
      const alive = room.players.filter(p => !p.eliminated);
      if (alive.length <= 1) {
        clearInterval(interval);

        io.to(roomId).emit('gameEnd', { winner: alive[0]?.name });
        if (room.callbackUrl) {
          axios.post(room.callbackUrl, {
            roomId,
            winner: alive[0]?.name,
            players: room.players.map(p => p.name),
            eliminationOrder: room.players.filter(p => p.eliminated).map(p => p.name)
          }).catch(console.error);
        }
        return;
      }

      const candidates = alive;
      const unlucky = candidates[Math.floor(Math.random() * candidates.length)];
      unlucky.eliminated = true;

      io.to(roomId).emit('eliminated', unlucky.name);
    }, 5000); // every 5 sec
  });

  socket.on('leaveRoom', () => {
    const { roomId, playerName } = socket.data;
    socket.leave(roomId);

    const room = rooms.get(roomId);
    if (room) {
      const stillThere = [...io.sockets.adapter.rooms.get(roomId) || []];
      if (stillThere.length === 0) {
        rooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
