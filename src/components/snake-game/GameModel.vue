<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { PALETTE_TOKENS } from '../../utils/gamePalette.js';
import PixelHeart from './PixelHeart.vue';

const props = defineProps({
  userData: {
    type: Object,
    required: true
  }
});

const gameMode = ref('LOCAL');
const countdown = ref(20);
const showModeMenu = ref(false);

const socket = ref(null);
const canvasRef = ref(null);
const gameInfo = reactive({
  localScore: 0,
  onlineScore: 0
});

const onlineGameState = reactive({
  myId: null,
  roomId: null,
  status: 'IDLE',
  players: {},     // { playerId: { name, score, alive } }
  snakes: {},      // { playerId: { body: [[x,y], ...], color } }
  food: [],        // [[x, y], [x, y], ...]
  mapSize: { w: 50, h: 50 }
});

let animationFrameId = null;
let frameCount = 0;
let countdownInterval = null;

// --- Local Game State ---
const localState = reactive({
  status: 'PLAYING',
  snake: [],
  food: { x: 25, y: 25 },
  direction: 'UP',
  nextDirection: 'UP',
  health: 6,
  bombs: [],
  stars: []
});

const initSnake = () => [
  { x: 25, y: 20 },
  { x: 25, y: 21 },
  { x: 25, y: 22 },
  { x: 25, y: 23 },
  { x: 25, y: 24 },
  { x: 25, y: 25 }
];
localState.snake = initSnake();

const palette = reactive({});

const SERVER_URL = 'ws://localhost:8765/ws';
const CELL_SIZE = 20;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const GRID_W = CANVAS_WIDTH / CELL_SIZE;
const GRID_H = CANVAS_HEIGHT / CELL_SIZE;

// ==================== 工具函式 ====================
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

// ==================== 倒數計時邏輯 ====================
const startCountdown = () => {
  countdown.value = 20;
  gameMode.value = 'CONNECTING';
  
  // ✅ 修正1: 倒數期間繼續玩單機遊戲
  localState.status = 'PLAYING';
  
  countdownInterval = setInterval(() => {
    countdown.value--;
    console.log(`⏰ 倒數: ${countdown.value} 秒`);
    
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      connect();
    }
  }, 1000);
};

const connectEarly = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdown.value = 0;
  }
  connect();
};

// ==================== Palette 解析 ====================
const resolvePalette = (tokens, target) => {
  const styles = getComputedStyle(document.documentElement);

  for (const key in tokens) {
    const value = tokens[key];
    if (typeof value === 'object') {
      target[key] = {};
      resolvePalette(value, target[key]);
    } else {
      target[key] = styles.getPropertyValue(value).trim() || '#FF00FF';
    }
  }
  target.bg = `rgba(26, 26, 26, 0.8)`;
};

// ==================== 單機遊戲邏輯 ====================
const getRandomPos = () => ({
  x: Math.floor(Math.random() * GRID_W),
  y: Math.floor(Math.random() * GRID_H)
});

const isOccupied = (pos) => {
  const { snake, bombs, stars, food } = localState;
  if (snake.some(s => s.x === pos.x && s.y === pos.y)) return true;
  if (bombs.some(b => b.x === pos.x && b.y === pos.y)) return true;
  if (stars.some(s => s.x === pos.x && s.y === pos.y)) return true;
  if (food.x === pos.x && food.y === pos.y) return true;
  return false;
};

const spawnItem = (type) => {
  let pos = getRandomPos();
  let attempts = 0;
  while (isOccupied(pos) && attempts < 100) {
    pos = getRandomPos();
    attempts++;
  }

  if (type === 'food') localState.food = pos;
  if (type === 'bomb') localState.bombs.push(pos);
  if (type === 'star') localState.stars.push(pos);
};

const respawnSnake = () => {
  localState.snake = initSnake();
  localState.direction = 'UP';
  localState.nextDirection = 'UP';
};

const resetLocalGame = () => {
  localState.status = 'PLAYING';
  localState.health = 6;
  localState.bombs = [];
  localState.stars = [];
  gameInfo.localScore = 0;
  respawnSnake();
  spawnItem('food');
};

const updateLocalGame = () => {
  if (localState.status !== 'PLAYING') return;

  localState.direction = localState.nextDirection;
  const head = { ...localState.snake[0] };

  if (localState.direction === 'UP') head.y--;
  if (localState.direction === 'DOWN') head.y++;
  if (localState.direction === 'LEFT') head.x--;
  if (localState.direction === 'RIGHT') head.x++;

  let collision = false;

  if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) {
    collision = true;
  }

  if (localState.snake.some(s => s.x === head.x && s.y === head.y)) {
    collision = true;
  }

  if (collision) {
    localState.health -= 1;
    if (localState.health <= 0) {
      if (gameMode.value === 'CONNECTING' || gameMode.value === 'ONLINE') {
        console.log("單機模式死亡，自動重置 (倒數繼續)");
        localState.health = 6;
        localState.bombs = [];
        localState.stars = [];
        gameInfo.localScore = 0;
        respawnSnake();
        spawnItem('food');
        return;
      }
      localState.status = 'GAMEOVER';
    } else {
      respawnSnake();
    }
    return;
  }

  const bombIndex = localState.bombs.findIndex(b => b.x === head.x && b.y === head.y);
  if (bombIndex !== -1) {
    localState.health -= 1;
    localState.bombs.splice(bombIndex, 1);
    if (localState.health <= 0) {
      if (gameMode.value === 'CONNECTING' || gameMode.value === 'ONLINE') {
        console.log("炸彈爆炸死亡，自動重置 (倒數繼續)");
        localState.health = 6;
        localState.bombs = [];
        localState.stars = [];
        gameInfo.localScore = 0;
        respawnSnake();
        spawnItem('food');
        return;
      }
      localState.status = 'GAMEOVER';
      return;
    }
  }

  localState.snake.unshift(head);

  const starIndex = localState.stars.findIndex(s => s.x === head.x && s.y === head.y);
  if (starIndex !== -1) {
    gameInfo.localScore += 20;
    localState.stars.splice(starIndex, 1);
    if (localState.snake.length > 3) localState.snake.pop();
  }

  if (head.x === localState.food.x && head.y === localState.food.y) {
    gameInfo.localScore += 10;
    spawnItem('food');

    if (gameInfo.localScore % 50 === 0) spawnItem('bomb');
    if (gameInfo.localScore % 100 === 0) spawnItem('star');

  } else {
    localState.snake.pop();
  }
};

// WebSocket 連線邏輯
const connect = () => {
  console.log("開始連線 WebSocket...");
	
	localState.status = 'IDLE';
	gameMode.value = 'ONLINE';

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdown.value = 0;

  socket.value = new WebSocket(SERVER_URL);

  socket.value.onopen = () => {
    console.log("✅ WebSocket Connected! Sending join payload...");
    
    let backendMode = "DQN";
    if (props.userData.mode === 2) {
      backendMode = "NEAT";
    } else if (props.userData.mode === 3) {
      backendMode = "bsf";
    }
    
    const joinPayload = {
      t: "join",
      username: props.userData.name,
      room_id: `room-${props.userData.roomId}`,
      mode: backendMode
    };
    
    console.log("選擇的遊戲模式:", backendMode);
    
    socket.value.send(JSON.stringify(joinPayload));
    console.log("Join payload sent:", joinPayload);
    console.log("等待後端回應 join_ok...");
  };
  
  socket.value.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📩 Received message:", data.t, data);
      
      if (data.t === "join_ok") {
        console.log("✅ 成功加入房間:", data.room_id);
        
        gameMode.value = 'ONLINE';
        
        localState.status = 'IDLE';
        localState.snake = [];
        localState.direction = 'UP';
        localState.nextDirection = 'UP';
        localState.health = 6;
        
        onlineGameState.myId = data.your_id;
        onlineGameState.roomId = data.room_id;
        onlineGameState.status = data.status;
        
        console.log("我的玩家ID:", onlineGameState.myId);
        console.log("後端遊戲狀態:", onlineGameState.status);
        console.log("切換到 ONLINE 模式，前端邏輯已停止");
        
        if (data.map) {
          onlineGameState.mapSize = data.map;
        }
        
        // 處理玩家列表
        if (data.players) {
          data.players.forEach(p => {
            onlineGameState.players[p.id] = {
              name: p.name,
              score: 0,
              alive: true
            };
          });
        }
        
        // ✅ 處理 snapshot (遊戲已經在進行中)
        if (data.snapshot) {
          console.log("📸 載入遊戲快照:", data.snapshot);
          
          if (data.snapshot.food) {
            onlineGameState.food = data.snapshot.food;
            console.log("🍎 快照食物:", data.snapshot.food);
          }
          
          if (data.snapshot.snakes) {
            console.log("🐍 快照蛇資料:", Object.keys(data.snapshot.snakes).length, "條蛇");
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
              
              // ✅ 如果我在快照中已經死亡，初始化分數
              if (isMe) {
                gameInfo.onlineScore = snakeData.score;
              }
            });
          }
        }
      }
      // ✅ 處理 game_start 訊息
      else if (data.t === "game_start") {
        console.log("🎮 遊戲開始!", data);
        gameMode.value = 'ONLINE';
        onlineGameState.status = 'RUNNING';
        
        if (data.food) {
          onlineGameState.food = data.food;
          console.log("🍎 食物位置:", data.food);
        }
        
        if (data.players) {
          console.log("👥 玩家列表:", data.players);
          data.players.forEach(p => {
            const isMe = p.id === onlineGameState.myId;
            onlineGameState.snakes[p.id] = {
              body: p.body,
              color: getPlayerColor(p.id, isMe),
              alive: true,
              name: p.name,
              score: 0
            };
            
            onlineGameState.players[p.id] = {
              name: p.name,
              score: 0,
              alive: true
            };
          });
          
          // 初始化自己的分數
          gameInfo.onlineScore = 0;
        }
      }
      // ✅ 處理 delta 更新
      else if (data.t === "d") {
        // ✅ 修正5: 只有在 ONLINE 模式才處理 delta
        if (gameMode.value !== 'ONLINE') {
          console.warn("⚠️ 非 ONLINE 模式收到 delta，忽略");
          return;
        }
        
        // 更新食物
        if (data.food) {
          onlineGameState.food = data.food;
        }
        
        // 更新蛇的移動
        if (data.moves) {
          data.moves.forEach(move => {
            const playerId = move.id;
            const isMe = playerId === onlineGameState.myId;
            
            // 玩家死亡
            if (move.dead) {
              if (isMe) {
                console.error("💀 我死了!進入觀戰模式");
              }
              if (onlineGameState.snakes[playerId]) {
                onlineGameState.snakes[playerId].alive = false;
                onlineGameState.snakes[playerId].body = [];
              }
              if (onlineGameState.players[playerId]) {
                onlineGameState.players[playerId].alive = false;
              }
              return;
            }
            
            // 更新蛇的位置
            if (onlineGameState.snakes[playerId]) {
              const snake = onlineGameState.snakes[playerId];
              
              if (move.head_add) {
                snake.body.unshift(move.head_add);
              }
              
              if (move.tail_remove && snake.body.length > 0) {
                snake.body.pop();
              }
              
              if (move.score !== undefined) {
                snake.score = move.score;
                if (onlineGameState.players[playerId]) {
                  onlineGameState.players[playerId].score = move.score;
                }
                
                if (playerId === onlineGameState.myId) {
                  gameInfo.onlineScore = move.score;
                }
              }
            }
          });
        }
      }
      else if (data.t === "game_over") {
        console.log("遊戲結束! 完整資料:", data);
        gameMode.value = 'FINISHED';
        onlineGameState.status = 'FINISHED';
        showModeMenu.value = true;
      }
      else if (data.t === "err") {
        console.error("❌ 伺服器錯誤:", data.code);
      }
      
    } catch (e) { 
      console.error("❌ Error parsing message:", e); 
    }
  };

  socket.value.onclose = (e) => {
    console.log("🔌 WebSocket Disconnected:", e.code, e.reason);
    if (gameMode.value === 'ONLINE' || gameMode.value === 'CONNECTING') {
      // ✅ 修正5: 斷線時顯示結束畫面，而非切回單機
      gameMode.value = 'FINISHED';
      onlineGameState.status = 'FINISHED';
      showModeMenu.value = true;
      console.log("⚠️ 連線中斷，顯示遊戲結束畫面");
    }
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
  gameMode.value = 'LOCAL';
  onlineGameState.snakes = {};
  onlineGameState.food = [];
  console.log("🔌 手動斷線,切換回單機模式");
};

// ==================== 模式選單處理 ====================
const chooseContinueOnline = () => {
  showModeMenu.value = false;
  
  // 重新連線
  onlineGameState.snakes = {};
  onlineGameState.food = [];
  onlineGameState.players = {};
  onlineGameState.myId = null;
  gameInfo.onlineScore = 0;
  
  startCountdown();
};

const choosePlayLocal = () => {
  showModeMenu.value = false;
  disconnect();
  resetLocalGame();
  gameMode.value = 'LOCAL';
};

// ==================== 渲染邏輯 ====================
const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const isLocal = gameMode.value !== 'ONLINE';

  if (!palette.snake) return;

  // Clear & Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = palette.grid || 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += CELL_SIZE) {
    ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += CELL_SIZE) {
    ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();

  // ==================== 單機模式渲染 ====================
  if (isLocal) {
    // ✅ CONNECTING 模式下也渲染遊戲物件（倒數期間可以玩）
    if (gameMode.value === 'LOCAL' || gameMode.value === 'CONNECTING') {
      // Bombs
      localState.bombs.forEach(b => {
        const x = b.x * CELL_SIZE;
        const y = b.y * CELL_SIZE;
        ctx.fillStyle = palette.bomb.body;
        ctx.beginPath();
        ctx.arc(x + 10, y + 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.bomb.fuse;
        ctx.fillRect(x + 9, y + 2, 2, 4);
      });

      // Stars
      localState.stars.forEach(s => {
        const x = s.x * CELL_SIZE;
        const y = s.y * CELL_SIZE;
        ctx.fillStyle = palette.star.body;
        ctx.strokeStyle = palette.star.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 2);
        ctx.lineTo(x + 12, y + 8);
        ctx.lineTo(x + 18, y + 8);
        ctx.lineTo(x + 13, y + 12);
        ctx.lineTo(x + 15, y + 18);
        ctx.lineTo(x + 10, y + 14);
        ctx.lineTo(x + 5, y + 18);
        ctx.lineTo(x + 7, y + 12);
        ctx.lineTo(x + 2, y + 8);
        ctx.lineTo(x + 8, y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Food (單機)
      const fx = localState.food.x * CELL_SIZE;
      const fy = localState.food.y * CELL_SIZE;
      ctx.fillStyle = palette.food.body;
      ctx.fillRect(fx, fy, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = palette.food.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, fy, CELL_SIZE, CELL_SIZE);
      ctx.fillStyle = palette.food.leaf;
      ctx.fillRect(fx + CELL_SIZE - 6, fy - 4, 8, 8);

      // Snake (單機)
      localState.snake.forEach((pos, index) => {
        const x = pos.x * CELL_SIZE;
        const y = pos.y * CELL_SIZE;
        ctx.fillStyle = index === 0 ? palette.snake.head : palette.snake.body;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        if (index === 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        ctx.strokeStyle = palette.snake.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        if (index === 0) {
          ctx.fillStyle = 'white';
          ctx.fillRect(x + 4, y + 4, 4, 4);
          ctx.fillRect(x + 12, y + 4, 4, 4);

          if (Math.floor(frameCount / 15) % 2 === 0) {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(x + 8, y - 6, 4, 6);
          }
        }
      });
    }
  }
  // ==================== 多人模式渲染 ====================
  else {
    // ✅ 繪製多個食物
    onlineGameState.food.forEach(foodPos => {
      const [fx, fy] = foodPos;
      const px = fx * CELL_SIZE;
      const py = fy * CELL_SIZE;
      
      ctx.fillStyle = palette.food.body;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = palette.food.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
      ctx.fillStyle = palette.food.leaf;
      ctx.fillRect(px + CELL_SIZE - 6, py - 4, 8, 8);
    });

    // ✅ 繪製多條蛇
    Object.entries(onlineGameState.snakes).forEach(([playerId, snakeData]) => {
      if (!snakeData.alive || !snakeData.body || snakeData.body.length === 0) return;
      
      const isMe = playerId === onlineGameState.myId;
      const color = snakeData.color;
      
      snakeData.body.forEach((pos, index) => {
        const [sx, sy] = pos;
        const px = sx * CELL_SIZE;
        const py = sy * CELL_SIZE;

        ctx.fillStyle = index === 0 ? color.head : color.body;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        if (index === 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        ctx.strokeStyle = color.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

        if (index === 0 && isMe) {
          ctx.fillStyle = 'white';
          ctx.fillRect(px + 4, py + 4, 4, 4);
          ctx.fillRect(px + 12, py + 4, 4, 4);

          if (Math.floor(frameCount / 15) % 2 === 0) {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(px + 8, py - 6, 4, 6);
          }
        }
      });
      
      // 繪製玩家名稱標籤
      if (snakeData.body.length > 0) {
        const [hx, hy] = snakeData.body[0];
        const px = hx * CELL_SIZE;
        const py = hy * CELL_SIZE;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '12px "VT323"';
        ctx.textAlign = 'center';
        const name = snakeData.name || 'Unknown';
        const textWidth = ctx.measureText(name).width;
        ctx.fillRect(px - textWidth/2 - 4, py - 24, textWidth + 8, 16);
        
        ctx.fillStyle = isMe ? '#4ade80' : 'white';
        ctx.fillText(name, px, py - 12);
      }
    });
  }

  // 倒數計時
  if (gameMode.value === 'CONNECTING' && countdown.value > 0) {

    // 數字
    ctx.fillStyle = 'rgba(255, 200, 0, 1)';
    ctx.font = 'bold 80px "VT323"';
    ctx.textAlign = 'right';
    ctx.fillText(countdown.value, canvas.width - 50, 100);
    
    // 文字
    ctx.font = 'bold 20px "VT323"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.textAlign = 'center';
    ctx.fillText('CONNECTING TO SERVER...', canvas.width / 2, 30);
    
    ctx.font = '18px "VT323"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Press SPACE to connect now', canvas.width / 2, 50);
  }

  // 模式狀態
  if (gameMode.value === 'LOCAL' && localState.status === 'PLAYING') {
    ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
    ctx.font = '20px "VT323"';
    ctx.textAlign = 'center';
    ctx.fillText('LOCAL MODE', canvas.width / 2, 30);
  }
  
  if (gameMode.value === 'ONLINE') {
    ctx.fillStyle = 'rgba(100, 150, 255, 0.7)';
    ctx.font = '20px "VT323"';
    ctx.textAlign = 'center';
    const playerCount = Object.keys(onlineGameState.players).length;
    ctx.fillText(`🌐 ONLINE - ${playerCount} Players`, canvas.width / 2, 30);
  }
};

const renderLoop = () => {
  frameCount++;
  
  // CONNECTING 時執行單機遊戲
  if (gameMode.value === 'CONNECTING' && localState.status === 'PLAYING' && frameCount % 10 === 0) {
    updateLocalGame();
  }
  // 純 LOCAL 模式
  else if (gameMode.value === 'LOCAL' && localState.status === 'PLAYING' && frameCount % 10 === 0) {
    updateLocalGame();
  }
  // ONLINE 和 FINISHED 模式不執行單機遊戲邏輯
  
  render();
  animationFrameId = requestAnimationFrame(renderLoop);
};

// ==================== 鍵盤輸入處理 ====================
const handleKeydown = (e) => {
  if (e.key === ' ' && gameMode.value === 'CONNECTING') {
    e.preventDefault();
    connectEarly();
    return;
  }
  
  const keyToDir = {
    'ArrowUp': 'up', 
    'ArrowDown': 'down', 
    'ArrowLeft': 'left', 
    'ArrowRight': 'right',
    'w': 'up', 
    's': 'down', 
    'a': 'left', 
    'd': 'right'
  };
  const dir = keyToDir[e.key];

  if (dir) {
    if (gameMode.value === 'LOCAL' || gameMode.value === 'CONNECTING') {
      const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
      if (localState.direction.toLowerCase() !== opposites[dir]) {
        localState.nextDirection = dir.toUpperCase();
      }
    }
    
    if (gameMode.value === 'ONLINE' && socket.value && socket.value.readyState === WebSocket.OPEN) {
      console.log("[ONLINE] 發送方向到後端:", dir);
      socket.value.send(JSON.stringify({ 
        t: "in", 
        d: dir 
      }));
    }
  }
};

const currentScore = computed(() => {
  return gameMode.value === 'ONLINE' ? gameInfo.onlineScore : gameInfo.localScore;
});

onMounted(() => {
  console.log("=== GameBoard 初始化 ===");
  console.log("📦 userData:", props.userData);
  console.log("  - name:", props.userData.name);
  console.log("  - roomId:", props.userData.roomId);
  console.log("  - mode:", props.userData.mode || "未設定");
  console.log("========================");
  
  resolvePalette(PALETTE_TOKENS, palette);
  startCountdown();
  renderLoop();
});

useEventListener(window, 'keydown', handleKeydown);

onUnmounted(() => {
  if (socket.value) socket.value.close();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (countdownInterval) clearInterval(countdownInterval);
});
</script>

<template>
  <div class="relative z-20 flex flex-col items-center">

    <!-- Header -->
    <div class="flex justify-between px-0 mb-4 w-full" style="max-width: 1000px;">
      <div class="c-scoreboard-item mr-4 flex justify-between items-center px-4">
        <span>SCORE: {{ currentScore }}</span>

        <div v-if="gameMode !== 'ONLINE'" class="flex gap-1 ml-4">
          <PixelHeart v-for="i in 3" :key="i"
            :status="localState.health >= i * 2 ? 'full' : (localState.health === i * 2 - 1 ? 'half' : 'empty')" />
        </div>
      </div>
      <div class="c-scoreboard-item">
        ROOM: {{ userData.roomId }}
        <span v-if="gameMode === 'LOCAL'" class="ml-2 text-green-400">🎮 LOCAL</span>
        <span v-if="gameMode === 'ONLINE'" class="ml-2 text-blue-400">
          🌐 ONLINE ({{ Object.keys(onlineGameState.players).length }}人)
        </span>
        <span v-if="gameMode === 'CONNECTING'" class="ml-2 text-yellow-400">⏰ {{ countdown }}s</span>
      </div>
    </div>

    <!-- Game Area -->
    <div class="c-game-area">
      <canvas ref="canvasRef" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT"
        class="block cursor-none rendering-pixelated"></canvas>

      <div v-if="localState.status === 'GAMEOVER' && gameMode === 'LOCAL'"
        class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-50">
        <h2 class="text-6xl c-text-title mb-4">GAME OVER</h2>
        <div class="text-2xl mb-8 font-vt323">SCORE: {{ gameInfo.localScore }}</div>
        <button @click="resetLocalGame" class="c-btn-game">RESTART</button>
      </div>

      <!-- 後端遊戲結束選單 -->
      <div v-if="showModeMenu"
        class="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50">
        <h2 class="text-5xl c-text-title mb-6">🏁 GAME FINISHED</h2>
        <div class="text-xl mb-8 font-vt323">Choose your next mode:</div>
        
        <div class="flex flex-col gap-4">
          <button @click="chooseContinueOnline" class="c-btn-game">
            🌐 CONTINUE ONLINE
          </button>
          <button @click="choosePlayLocal" class="c-btn-game">
            🎮 PLAY LOCAL
          </button>
        </div>
      </div>
    </div>

    <div class="c-hint-text">
      <span v-if="gameMode === 'CONNECTING'">
        ⏰ CONNECTING IN {{ countdown }}s - PRESS SPACE TO CONNECT NOW
      </span>
      <span v-else>
        USE ARROW KEYS TO MOVE
      </span>
    </div>
  </div>
</template>