const form = document.getElementById('join-form');
const nicknameInput = document.getElementById('nickname');
const lobby = document.getElementById('lobby');
const nicknameDisplay = document.getElementById('nickname-display');
const playerList = document.getElementById('player-list');
const errorMsg = document.getElementById('error');

let socket = null;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nickname = nicknameInput.value.trim();
  if (!nickname) return;

  socket = new WebSocket(`ws://${location.host}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'join', nickname }));
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'error') {
      if (msg.reason === 'room_full') {
        errorMsg.textContent = 'The room is full. Please try again later.';
      } else if (msg.reason === 'invalid_nickname') {
        errorMsg.textContent = 'Invalid nickname.';
      } else if (msg.reason === 'nickname_taken') {
        errorMsg.textContent = 'This nickname is already taken. Please choose another.';
      }
      return;
    }

    if (msg.type === 'welcome') {
      form.style.display = 'none';
      lobby.style.display = 'block';
      nicknameDisplay.textContent = `You are: ${msg.nickname}`;
      errorMsg.textContent = '';
    }

    if (msg.type === 'players') {
      playerList.innerHTML = '';
      msg.list.forEach((nick) => {
        const li = document.createElement('li');
        li.textContent = nick;
        playerList.appendChild(li);
      });
    }

    if (msg.type === 'chat') {
      console.log(`[${msg.from}]: ${msg.text}`);
    }
  };

  socket.onclose = () => {
    errorMsg.textContent = 'Disconnected from server.';
  };
});
