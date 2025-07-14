const socket = io();

function join() {
  const roomId = document.getElementById('roomId').value;
  const name = document.getElementById('name').value;
  socket.emit('joinRoom', { roomId, playerName: name });
}

function start() {
  socket.emit('startGame');
}

// socket.on('playerList', (players) => {
//   document.getElementById('players').innerText = 'Players: ' + players.map(p => p.name).join(', ');
// });
socket.on('playerList', (players) => {
  const container = document.getElementById('players-container');
  container.innerHTML = ''; // clear existing

  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  players.forEach((p, i) => {
    const angle = (2 * Math.PI * i) / players.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const el = document.createElement('div');
    el.className = 'player';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerText = p.name;

    if (p.eliminated) {
      el.style.opacity = '0.3';
      el.style.textDecoration = 'line-through';
    }

    container.appendChild(el);
  });
});


socket.on('eliminated', (name) => {
  document.getElementById('status').innerText = `${name} was eliminated.`;
});

socket.on('gameEnd', ({ winner }) => {
  document.getElementById('status').innerText = `🎉 Winner: ${winner}`;
});
