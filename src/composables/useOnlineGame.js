import { ref, reactive } from 'vue';

export function useOnlineGame() {
  const socket = ref(null);
  const SERVER_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  const isBotPlayerId = (pid) => typeof pid === 'string' && pid.startsWith('bot_');
  const DEFAULT_MAP_SIZE = { w: 50, h: 50 };

  const onlineGameState = reactive({
    myId: null,
    roomId: null,
    status: 'IDLE',
    players: {},
    snakes: {},
    food: [],
    mapSize: { ...DEFAULT_MAP_SIZE }
  });

  const onlineScore = reactive({ value: 0 });

  const getPlayerColor = (playerId, isMe, playerName = '') => {
    if (isMe) {
      return {
        body: '#4ade80',
        head: '#86efac',
        border: '#166534'
      };
    }

    const seed = `${playerId}:${playerName || ''}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    const sat = 60 + (Math.abs((hash >> 3) % 15));
    const light = 52 + (Math.abs((hash >> 7) % 10));
    return {
      body: `hsl(${hue}, ${sat}%, ${light}%)`,
      head: `hsl(${hue}, ${sat}%, ${Math.min(85, light + 14)}%)`,
      border: `hsl(${hue}, ${sat}%, ${Math.max(25, light - 26)}%)`
    };
  };

  const connect = (userData, callbacks) => {
    let aiDemoAnnounced = false;
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
          aiDemoAnnounced = false;
          onlineScore.value = 0;
          onlineGameState.myId = data.your_id;
          onlineGameState.roomId = data.room_id;
          onlineGameState.status = data.status;

          if (data.map) onlineGameState.mapSize = data.map;

          onlineGameState.players = {};
          onlineGameState.snakes = {};
          onlineGameState.food = [];
          const assumeAliveByDefault = data.status !== "RUNNING";
          if (data.players) {
            data.players.forEach(p => {
              onlineGameState.players[p.id] = {
                name: p.name,
                score: 0,
                alive: p.alive !== undefined ? p.alive : assumeAliveByDefault,
                connected: p.connected !== undefined ? p.connected : true
              };
            });
          }

          let snapshotSnakes = {};
          if (data.snapshot) {
            if (Array.isArray(data.snapshot.food)) onlineGameState.food = data.snapshot.food;
            snapshotSnakes = data.snapshot.snakes || {};
            Object.entries(snapshotSnakes).forEach(([playerId, snakeData]) => {
              const isMe = playerId === onlineGameState.myId;
              const snakeName = snakeData.name || onlineGameState.players[playerId]?.name || playerId;
              onlineGameState.snakes[playerId] = {
                body: snakeData.body,
                color: getPlayerColor(playerId, isMe, snakeName),
                alive: snakeData.alive,
                getName: () => snakeData.name || 'Unknown', // Helper to get name
                name: snakeName,
                score: snakeData.score
              };
              if (onlineGameState.players[playerId]) {
                onlineGameState.players[playerId].score = snakeData.score;
                onlineGameState.players[playerId].alive = snakeData.alive;
                // Snapshot doesn't usually send connected, assume true if in snapshot
                onlineGameState.players[playerId].connected = true;
              }
              if (isMe) onlineScore.value = snakeData.score;
            });
          }

          // For mid-game joins, players not present in snapshot snakes should be treated as dead.
          if (data.status === "RUNNING") {
            const aliveIds = new Set(Object.keys(snapshotSnakes));
            Object.keys(onlineGameState.players).forEach((pid) => {
              if (!aliveIds.has(pid)) {
                onlineGameState.players[pid].alive = false;
              }
            });
          }

          // Joining an already-running room may not emit game_start for this client.
          // Ensure UI switches to active online rendering immediately.
          if (data.status === "RUNNING" && callbacks.onGameStart) callbacks.onGameStart();
          if (callbacks.onJoinOk) callbacks.onJoinOk(data);
        }
        else if (data.t === "game_start") {
          aiDemoAnnounced = false;
          onlineGameState.status = 'RUNNING';
          onlineGameState.food = data.food;
          onlineGameState.players = {};
          onlineGameState.snakes = {};
          data.players.forEach(p => {
            const isMe = p.id === onlineGameState.myId;
            onlineGameState.snakes[p.id] = {
              body: p.body,
              color: getPlayerColor(p.id, isMe, p.name),
              alive: true,
              name: p.name,
              score: 0
            };
            onlineGameState.players[p.id] = {
              name: p.name,
              score: 0,
              alive: true,
              connected: p.connected !== undefined ? p.connected : true
            };
          });
          onlineScore.value = 0;
          if (callbacks.onGameStart) callbacks.onGameStart();
        }
        else if (data.t === "d") {
          const mode = callbacks.getGameMode();
          if (mode !== 'ONLINE' && mode !== 'CONNECTING') return;
          if (data.food) onlineGameState.food = data.food;

          if (data.moves) {
            const deathEvents = [];
            let sawAI2Revived = false;

            data.moves.forEach(move => {
              const pid = move.id;
              const isMe = pid === onlineGameState.myId;
              const moveName = move.name || onlineGameState.players[pid]?.name || onlineGameState.snakes[pid]?.name || pid;
              const snakeMissing = !onlineGameState.snakes[pid];
              const initializedFromBody = Boolean(move.revived && move.body);

              if (!onlineGameState.players[pid]) {
                onlineGameState.players[pid] = {
                  name: moveName,
                  score: 0,
                  alive: true,
                  connected: true
                };
              } else if (move.name) {
                onlineGameState.players[pid].name = move.name;
              }

              if (move.dead) {
                if (onlineGameState.snakes[pid]) {
                  onlineGameState.snakes[pid].alive = false;
                  onlineGameState.snakes[pid].body = [];
                }
                if (onlineGameState.players[pid]) onlineGameState.players[pid].alive = false;

                deathEvents.push({
                  id: pid,
                  name: onlineGameState.players[pid]?.name || moveName || 'Unknown',
                  reason: move.reason
                });
                return;
              }

              if (move.revived || snakeMissing) {
                const fallbackBody = move.head_add ? [move.head_add] : [];
                onlineGameState.snakes[pid] = {
                  body: move.body ? [...move.body] : fallbackBody,
                  color: getPlayerColor(pid, isMe, moveName),
                  alive: true,
                  name: moveName,
                  score: move.score || 0
                };
              } else if (move.name) {
                onlineGameState.snakes[pid].name = move.name;
              }

              const snake = onlineGameState.snakes[pid];
              if (snake) {
                const initializedWithHead = snakeMissing && !move.body && Boolean(move.head_add);
                if (!initializedFromBody && !initializedWithHead) {
                  if (move.head_add) snake.body.unshift(move.head_add);
                  if (move.tail_remove && snake.body.length > 0) snake.body.pop();
                }
                snake.alive = move.alive !== undefined ? move.alive : true;
                snake.name = moveName;

                if (move.score !== undefined) {
                  snake.score = move.score;
                  if (onlineGameState.players[pid]) onlineGameState.players[pid].score = move.score;
                  if (isMe) onlineScore.value = move.score;
                }

                if (onlineGameState.players[pid]) {
                  onlineGameState.players[pid].alive = snake.alive;
                }

                if (move.revived && moveName === 'AI2' && isBotPlayerId(pid)) {
                  sawAI2Revived = true;
                }
              }
            });

            const aliveHumans = Object.entries(onlineGameState.players).some(([playerId, player]) => {
              return !isBotPlayerId(playerId) && player?.alive;
            });
            const aliveBots = Object.entries(onlineGameState.players).filter(([playerId, player]) => {
              return isBotPlayerId(playerId) && player?.alive;
            }).length;

            const aiDemoStartedNow = sawAI2Revived && !aiDemoAnnounced && !aliveHumans && aliveBots >= 2;
            if (aiDemoStartedNow) {
              aiDemoAnnounced = true;
              if (callbacks.onAIDemoStart) callbacks.onAIDemoStart();
            }

            if (callbacks.onPlayerDied) {
              deathEvents.forEach((ev) => {
                const isHuman = !isBotPlayerId(ev.id);
                if (aiDemoStartedNow && isHuman) return;
                callbacks.onPlayerDied(ev.name, ev.reason);
              });
            }
          }
        }
        else if (data.t === "game_over") {
          onlineGameState.status = 'FINISHED';
          if (callbacks.onGameOver) callbacks.onGameOver(data);
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
      if (socket.value.readyState === WebSocket.OPEN) {
        socket.value.send(JSON.stringify({ t: "exit" }));
      }
      socket.value.close();
      socket.value = null;
    }
    onlineGameState.snakes = {};
    onlineGameState.food = [];
    onlineGameState.players = {};
    onlineGameState.myId = null;
    onlineGameState.roomId = null;
    onlineGameState.status = 'IDLE';
    onlineGameState.mapSize = { ...DEFAULT_MAP_SIZE };
    onlineScore.value = 0;
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
