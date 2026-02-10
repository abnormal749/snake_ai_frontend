import { ref, reactive } from 'vue';

export function useOnlineGame() {
  const socket = ref(null);
  const SERVER_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  
  const onlineGameState = reactive({
    myId: null,
    roomId: null,
    status: 'IDLE',
    players: {}, 
    snakes: {},      
    food: [],
    mapSize: { w: 50, h: 50 }
  });

  const onlineScore = reactive({ value: 0 });

  const getPlayerColor = (playerId, isMe) => {
    if (isMe) {
      return {
        body: '#4ade80',
        head: '#86efac',
        border: '#166534'
      };
    }
    
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    return {
      body: `hsl(${hue}, 70%, 60%)`,
      head: `hsl(${hue}, 70%, 75%)`,
      border: `hsl(${hue}, 70%, 30%)`
    };
  };

  const connect = (userData, callbacks) => {
    socket.value = new WebSocket(SERVER_URL);

    socket.value.onopen = () => {
      let backendMode = "DQN";
      if (userData.mode === 2) {
        backendMode = "NEAT";
      } else if (userData.mode === 3) {
        backendMode = "bsf";
      }
      
      const joinPayload = {
        t: "join",
        username: userData.name,
        room_id: `room-${userData.roomId}`,
        mode: backendMode
      };
      
      socket.value.send(JSON.stringify(joinPayload));
    };
    
    socket.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.t === "join_ok") {
          onlineGameState.myId = data.your_id;
          onlineGameState.roomId = data.room_id;
          onlineGameState.status = data.status;
          
          if (data.map) onlineGameState.mapSize = data.map;
          
          onlineGameState.players = {};
          if (data.players) {
            data.players.forEach(p => {
              onlineGameState.players[p.id] = {
                name: p.name,
                score: 0,
                alive: true
              };
            });
          }
          
          if (data.snapshot) {
            if (data.snapshot.food) onlineGameState.food = data.snapshot.food;
            Object.entries(data.snapshot.snakes).forEach(([playerId, snakeData]) => {
              const isMe = playerId === onlineGameState.myId;
              onlineGameState.snakes[playerId] = {
                body: snakeData.body,
                color: getPlayerColor(playerId, isMe),
                alive: snakeData.alive,
                name: snakeData.name,
                score: snakeData.score
              };
              if (onlineGameState.players[playerId]) {
                onlineGameState.players[playerId].score = snakeData.score;
                onlineGameState.players[playerId].alive = snakeData.alive;
              }
              if (isMe) onlineScore.value = snakeData.score;
            });
          }
          
          if (callbacks.onJoinOk) callbacks.onJoinOk();
        }
        else if (data.t === "game_start") {
          onlineGameState.status = 'RUNNING';
          onlineGameState.food = data.food;
          onlineGameState.snakes = {};
          data.players.forEach(p => {
            const isMe = p.id === onlineGameState.myId;
            onlineGameState.snakes[p.id] = {
              body: p.body,
              color: getPlayerColor(p.id, isMe),
              alive: true,
              name: p.name,
              score: 0
            };
            onlineGameState.players[p.id] = { name: p.name, score: 0, alive: true };
          });
          onlineScore.value = 0;
          if (callbacks.onGameStart) callbacks.onGameStart();
        }
        else if (data.t === "d") {
          if (callbacks.getGameMode() !== 'ONLINE') return;
          if (data.food) onlineGameState.food = data.food;
          
          if (data.moves) {
            data.moves.forEach(move => {
              const pid = move.id;
              const isMe = pid === onlineGameState.myId;
              
              if (move.dead) {
                if (onlineGameState.snakes[pid]) {
                  onlineGameState.snakes[pid].alive = false;
                  onlineGameState.snakes[pid].body = [];
                }
                if (onlineGameState.players[pid]) onlineGameState.players[pid].alive = false;
                
                if (callbacks.onPlayerDied) {
                    const name = onlineGameState.players[pid]?.name || 'Unknown';
                    callbacks.onPlayerDied(name, move.reason);
                }
                return;
              }
              
              if (move.revived || !onlineGameState.snakes[pid]) {
                 onlineGameState.snakes[pid] = {
                   body: move.head_add ? [move.head_add] : [],
                   color: getPlayerColor(pid, isMe),
                   alive: true,
                   name: onlineGameState.players[pid]?.name || 'AI',
                   score: move.score || 0
                 };
              }

              const snake = onlineGameState.snakes[pid];
              if (snake) {
                  if (move.head_add) snake.body.unshift(move.head_add);
                  if (move.tail_remove && snake.body.length > 0) snake.body.pop();
                  
                  if (move.score !== undefined) {
                    snake.score = move.score;
                    if (onlineGameState.players[pid]) onlineGameState.players[pid].score = move.score;
                    if (isMe) onlineScore.value = move.score;
                  }
              }
            });
          }
        }
        else if (data.t === "game_over") {
          onlineGameState.status = 'FINISHED';
          if (callbacks.onGameOver) callbacks.onGameOver();
        }
        else if (data.t === "err") {
          onlineGameState.status = 'IDLE';
          if (callbacks.onError) callbacks.onError(data.code);
          disconnect();
        }
      } catch (e) { console.error("❌ Error parsing message:", e); }
    };

    socket.value.onclose = (e) => {
      console.log("WebSocket Disconnected:", e.code, e.reason);
      if (callbacks.onClose) callbacks.onClose();
    };

    socket.value.onerror = (err) => {
      console.error("❌ WebSocket Error:", err);
    };
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.close();
      socket.value = null;
    }
    onlineGameState.snakes = {};
    onlineGameState.food = [];
  };

  const sendInput = (dir) => {
    if (socket.value && socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({ t: "in", d: dir }));
    }
  };

  return {
    socket,
    onlineGameState,
    onlineScore,
    connect,
    disconnect,
    sendInput
  };
}
