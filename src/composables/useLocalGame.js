import { reactive } from 'vue';

export function useLocalGame() {
  const GRID_W = 50; 
  const GRID_H = 50;

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

  const localScore = reactive({ value: 0 });

  const initSnake = () => [
    { x: 25, y: 20 },
    { x: 25, y: 21 },
    { x: 25, y: 22 },
    { x: 25, y: 23 },
    { x: 25, y: 24 },
    { x: 25, y: 25 }
  ];

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
    
    if (attempts >= 100) {
      return;
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
    localScore.value = 0;
    respawnSnake();
    spawnItem('food');
  };

  const updateLocalGame = (gameModeValue) => {
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
        if (gameModeValue === 'CONNECTING' || gameModeValue === 'ONLINE') {
          localState.health = 6;
          localState.bombs = [];
          localState.stars = [];
          localScore.value = 0;
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
        if (gameModeValue === 'CONNECTING' || gameModeValue === 'ONLINE') {
          localState.health = 6;
          localState.bombs = [];
          localState.stars = [];
          localScore.value = 0;
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
      localScore.value += 20;
      localState.stars.splice(starIndex, 1);
      if (localState.snake.length > 3) localState.snake.pop();
    }

    if (head.x === localState.food.x && head.y === localState.food.y) {
      localScore.value += 10;
      spawnItem('food');

      if (localScore.value % 50 === 0) spawnItem('bomb');
      if (localScore.value % 100 === 0) spawnItem('star');

    } else {
      localState.snake.pop();
    }
  };

  localState.snake = initSnake();

  return {
    localState,
    localScore,
    resetLocalGame,
    updateLocalGame,
    spawnItem,
    respawnSnake
  };
}