import { ref } from 'vue';

export function useGameController(localGame, onlineGame, props) {
  const { localState, resetLocalGame } = localGame;
  const { connect: connectOnline, disconnect: disconnectOnline, sendInput } = onlineGame;

  const gameMode = ref('LOCAL');
  const countdown = ref(20);
  const showModeMenu = ref(false);
  const toastMessage = ref(null);
  let countdownInterval = null;
  let toastTimeout = null;

  const showToast = (msg) => {
    toastMessage.value = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMessage.value = null;
    }, 3000);
  };

  const handleConnect = () => {
    localState.status = 'IDLE';
    gameMode.value = 'ONLINE';
    
    connectOnline(props.userData, {
      getGameMode: () => gameMode.value,
      onJoinOk: (joinData) => {
        gameMode.value = 'ONLINE';
        localState.status = 'IDLE';
        if (joinData?.status === 'WAITING') {
          showToast('已加入房間，約等待 5 秒後開始');
        }
      },
      onGameStart: () => {
        showModeMenu.value = false;
      },
      onPlayerDied: (name, reason) => {
        let reasonText = "died";
        if (reason === "wall") reasonText = "hit a wall";
        else if (reason === "body") reasonText = "ran into a snake";
        else if (reason === "head-on") reasonText = "crashed head-on";
        
        showToast(`💀 ${name} ${reasonText}`);
      },
      onGameOver: () => {
        gameMode.value = 'FINISHED';
        setTimeout(() => {
            showModeMenu.value = true;
        }, 5000);
      },
      onError: (code) => {
        if (code === 'ROOM_FULL') showToast('房間已滿');
        else if (code === 'ROOM_NOT_FOUND') showToast('房間不存在');
        else showToast(`連線錯誤 (${code || 'UNKNOWN'})`);
        gameMode.value = 'FINISHED';
        showModeMenu.value = true;
      },
      onClose: () => {
        if (gameMode.value === 'ONLINE' || gameMode.value === 'CONNECTING') {
          gameMode.value = 'FINISHED';
          showModeMenu.value = true;
        }
      }
    });
  };

  const startCountdown = () => {
    countdown.value = 20;
    gameMode.value = 'CONNECTING';
    localState.status = 'PLAYING';
    
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      countdown.value--;
      
      if (countdown.value <= 0) {
        clearInterval(countdownInterval);
        handleConnect();
      }
    }, 1000);
  };

  const connectEarly = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdown.value = 0;
    }
    handleConnect();
  };

  const handleDisconnect = () => {
    disconnectOnline();
    gameMode.value = 'LOCAL';
    localState.status = 'PLAYING';
  };

  const chooseContinueOnline = (onlineGameState, onlineScore) => {
    disconnectOnline();
    showModeMenu.value = false;
    for (const key in onlineGameState.snakes) delete onlineGameState.snakes[key];
    onlineGameState.food.length = 0;
    for (const key in onlineGameState.players) delete onlineGameState.players[key];
    onlineGameState.myId = null;
    onlineScore.value = 0;
    
    startCountdown();
  };

  const choosePlayLocal = () => {
    showModeMenu.value = false;
    handleDisconnect();
    resetLocalGame();
  };

  const handleKeydown = (e) => {
    if (e.key === ' ' && gameMode.value === 'CONNECTING') {
      e.preventDefault();
      connectEarly();
      return;
    }
    
    const keyToDir = {
      'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
      'w': 'up', 's': 'down', 'a': 'left', 'd': 'right'
    };
    const dir = keyToDir[e.key];

    if (dir) {
      if (gameMode.value === 'LOCAL' || gameMode.value === 'CONNECTING') {
        const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (localState.direction.toLowerCase() !== opposites[dir]) {
          localState.nextDirection = dir.toUpperCase();
        }
      } else if (gameMode.value === 'ONLINE') {
        sendInput(dir);
      }
    }
  };

  const cleanup = () => {
    disconnectOnline();
    if (countdownInterval) clearInterval(countdownInterval);
  };

  return {
    gameMode,
    countdown,
    showModeMenu,
    toastMessage,
    startCountdown,
    chooseContinueOnline,
    choosePlayLocal,
    handleKeydown,
    cleanup
  };
}
