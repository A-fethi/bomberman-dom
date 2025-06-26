const {
  broadcastRoomTimer,
  broadcastEnterGameTimer,
} = require("./broadcast.js");

const ROOM_TIMER_DURATION = 30;

function startEnterGameTimer(rooms, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.enterGameTimerValue = 10;
  broadcastEnterGameTimer(rooms, roomId);
  room.enterGameTimerInterval = setInterval(() => {
    room.enterGameTimerValue--;
    broadcastEnterGameTimer(rooms, roomId);
    if (room.enterGameTimerValue <= 0) {
      clearInterval(room.enterGameTimerInterval);
      room.enterGameTimerInterval = null;
      room.enterGameTimerValue = 0;
      broadcastEnterGameTimer(rooms, roomId);
      // Game can start here
    }
  }, 1000);
}

function startRoomTimer(rooms, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.timerInterval) return; // already running
  room.timerValue = ROOM_TIMER_DURATION;
  room.locked = false;
  broadcastRoomTimer(rooms, roomId);
  room.timerInterval = setInterval(() => {
    room.timerValue--;
    broadcastRoomTimer(rooms, roomId);
    if (room.timerValue <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      room.timerValue = 0;
      broadcastRoomTimer(rooms, roomId);
      // Lock the room and start enter game timer
      room.locked = true;
      startEnterGameTimer(rooms, roomId);
    }
  }, 1000);
}

function stopRoomTimer(rooms, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  room.timerValue = ROOM_TIMER_DURATION;
  room.locked = false;
  broadcastRoomTimer(rooms, roomId);
  // Stop enter game timer if running
  if (room.enterGameTimerInterval) {
    clearInterval(room.enterGameTimerInterval);
    room.enterGameTimerInterval = null;
    room.enterGameTimerValue = 0;
    broadcastEnterGameTimer(rooms, roomId);
  }
}

module.exports = {
  startRoomTimer,
  stopRoomTimer,
  startEnterGameTimer,
}; 