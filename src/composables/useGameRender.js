import { reactive } from 'vue';

export function useGameRender() {
  const CELL_SIZE = 20;
  const palette = reactive({});

  const resolvePalette = (tokens) => {
    const styles = getComputedStyle(document.documentElement);
    const target = palette;

    const process = (tks, tgt) => {
      for (const key in tks) {
        const value = tks[key];
        if (typeof value === 'object') {
          tgt[key] = {};
          process(value, tgt[key]);
        } else {
          tgt[key] = styles.getPropertyValue(value).trim() || '#FF00FF';
        }
      }
    };
    process(tokens, target);
    target.bg = `rgba(26, 26, 26, 0.8)`;
  };

  const renderGrid = (ctx, width, height) => {
    ctx.strokeStyle = palette.grid || 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += CELL_SIZE) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += CELL_SIZE) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();
  };

  const renderLocalGame = (ctx, localState, frameCount) => {
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

    localState.stars.forEach(s => {
      const x = s.x * CELL_SIZE;
      const y = s.y * CELL_SIZE;
      ctx.fillStyle = palette.star.body;
      ctx.strokeStyle = palette.star.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 10, y + 10, 8, 0, Math.PI * 2); 
      ctx.fill();
      ctx.stroke();
    });

    const fx = localState.food.x * CELL_SIZE;
    const fy = localState.food.y * CELL_SIZE;
    ctx.fillStyle = palette.food.body;
    ctx.fillRect(fx, fy, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = palette.food.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, fy, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = palette.food.leaf;
    ctx.fillRect(fx + CELL_SIZE - 6, fy - 4, 8, 8);

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
  };

  const renderOnlineGame = (ctx, onlineGameState, frameCount) => {
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

      if (snakeData.body.length > 0) {
        const [hx, hy] = snakeData.body[0];
        const px = hx * CELL_SIZE;
        const py = hy * CELL_SIZE;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '16px "VT323"';
        ctx.textAlign = 'center';
        const name = snakeData.name || 'Unknown';
        const scoreStr = `${name}: ${snakeData.score || 0}`;
        const textWidth = ctx.measureText(scoreStr).width;
        ctx.fillRect(px - textWidth/2 - 4, py - 30, textWidth + 8, 20);
        
        ctx.fillStyle = isMe ? '#4ade80' : 'white';
        ctx.fillText(scoreStr, px, py - 14);
      }
    });
  };

  const render = (canvas, gameMode, localState, onlineGameState, frameCount, countdown) => {
    if (!canvas || !palette.snake) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderGrid(ctx, canvas.width, canvas.height);

    const isLocal = gameMode !== 'ONLINE';

    if (isLocal) {
      if (gameMode === 'LOCAL' || gameMode === 'CONNECTING') {
        renderLocalGame(ctx, localState, frameCount);
      }
    } else {
      renderOnlineGame(ctx, onlineGameState, frameCount);
    }

    // Countdown Overlay
    if (gameMode === 'CONNECTING' && countdown > 0) {
      ctx.fillStyle = 'rgba(255, 200, 0, 1)';
      ctx.font = 'bold 80px "VT323"';
      ctx.textAlign = 'right';
      ctx.fillText(countdown, canvas.width - 50, 100);
      
      ctx.font = 'bold 20px "VT323"';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('CONNECTING TO SERVER...', canvas.width / 2, 30);
      
      ctx.font = '18px "VT323"';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('Press SPACE to connect now', canvas.width / 2, 50);
    }

    // Local Mode Indicator
    if (gameMode === 'LOCAL' && localState.status === 'PLAYING') {
      ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
      ctx.font = '20px "VT323"';
      ctx.textAlign = 'center';
      ctx.fillText('LOCAL MODE', canvas.width / 2, 30);
    }
    
    // Online Mode Indicator
    if (gameMode === 'ONLINE') {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.7)';
      ctx.font = '20px "VT323"';
      ctx.textAlign = 'center';
      const playerCount = Object.keys(onlineGameState.snakes).length;
      ctx.fillText(`ONLINE - ${playerCount} Players`, canvas.width / 2, 30);
    }
  };

  return {
    palette,
    resolvePalette,
    render
  };
}
