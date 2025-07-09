const socket = io();

function join() {
  const roomId = document.getElementById('roomId').value;
  const name = document.getElementById('name').value;
  socket.emit('joinRoom', { roomId, playerName: name });
}

function start() {
  socket.emit('startGame');
}

socket.on('playerList', (players) => {
  document.getElementById('players').innerText = 'Players: ' + players.map(p => p.name).join(', ');
});

socket.on('eliminated', (name) => {
  document.getElementById('status').innerText = `${name} was eliminated.`;
});

socket.on('gameEnd', ({ winner }) => {
  document.getElementById('status').innerText = `🎉 Winner: ${winner}`;
});
