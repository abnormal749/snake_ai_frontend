import { ref } from 'vue';

export function useGameController(localGame, onlineGame, props) {
  const { localState, resetLocalGame } = localGame;
  const {
    connect: connectOnline,
    disconnect: disconnectOnline,
    sendInput,
    onlineGameState
  } = onlineGame;

  const gameMode = ref('LOCAL');
  const countdown = ref(20);
  const showModeMenu = ref(false);
  const toastMessage = ref(null);
  const toastType = ref('danger');
  const suppressNextClose = ref(false);
  let countdownInterval = null;
  let toastTimeout = null;

  const clearToast = () => {
    toastMessage.value = null;
    toastType.value = 'danger';
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
  };

  const showToast = (msg, type = 'danger') => {
    toastMessage.value = msg;
    toastType.value = type;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMessage.value = null;
    }, 3000);
  };

  const handleConnect = () => {
    suppressNextClose.value = false;
    clearToast();
    localState.status = 'IDLE';
    gameMode.value = 'ONLINE';
    
    connectOnline(props.userData, {
      getGameMode: () => gameMode.value,
      onJoinOk: (joinData) => {
        gameMode.value = 'ONLINE';
        localState.status = 'IDLE';
        if (joinData?.status === 'WAITING') {
          showToast('已加入房間，約等待 5 秒後開始', 'warning');
        } else if (joinData?.status === 'RUNNING') {
          showToast('遊戲進行中，已進入目前對局', 'warning');
        }
      },
      onGameStart: () => {
        showModeMenu.value = false;
      },
      onPlayerDied: (name, reason) => {
        let reasonText = "is out";
        if (reason === "wall") reasonText = "hit a wall";
        else if (reason === "body") reasonText = "ran into a snake";
        else if (reason === "head-on") reasonText = "crashed head-on";
        else if (reason === "collision") reasonText = "was out";

        showToast(`💀 ${name} ${reasonText}`);
      },
      onAIDemoStart: () => {
        showToast('玩家都出局了，接下來是 AI 雙機對戰展示', 'warning');
      },
      onGameOver: (gameOverData) => {
        const ranks = Array.isArray(gameOverData?.ranks) ? [...gameOverData.ranks] : [];
        ranks.sort((a, b) => {
          const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
          if (scoreDiff !== 0) return scoreDiff;
          return (a.rank ?? 999) - (b.rank ?? 999);
        });

        if (ranks.length > 0) {
          const rankLines = ranks.map((entry, idx) => {
            const pid = entry.id;
            const name =
              onlineGameState.players[pid]?.name ||
              onlineGameState.snakes[pid]?.name ||
              pid ||
              `P${idx + 1}`;
            return `${idx + 1}. ${name} - ${entry.score ?? 0}`;
          });
          showToast(`本局排名\n${rankLines.join('\n')}`, 'warning');
        }

        gameMode.value = 'FINISHED';
        setTimeout(() => {
            showModeMenu.value = true;
        }, 5000);
      },
      onError: (code) => {
        if (code === 'ROOM_FULL') showToast('房間已滿，請改選其他房間', 'warning');
        else if (code === 'ROOM_NOT_FOUND') showToast('房間不存在');
        else showToast(`連線錯誤 (${code || 'UNKNOWN'})`);
        gameMode.value = 'FINISHED';
        showModeMenu.value = true;
      },
      onClose: () => {
        if (suppressNextClose.value) {
          suppressNextClose.value = false;
          return;
        }
        if (gameMode.value === 'ONLINE' || gameMode.value === 'CONNECTING') {
          gameMode.value = 'FINISHED';
          showModeMenu.value = true;
        }
      }
    });
  };

  const startCountdown = () => {
    clearToast();
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
    clearToast();
    disconnectOnline();
    gameMode.value = 'LOCAL';
    localState.status = 'PLAYING';
  };

  const chooseContinueOnline = () => {
    suppressNextClose.value = true;
    clearToast();
    disconnectOnline();
    showModeMenu.value = false;
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
    clearToast();
    disconnectOnline();
    if (countdownInterval) clearInterval(countdownInterval);
  };

  return {
    gameMode,
    countdown,
    showModeMenu,
    toastMessage,
    toastType,
    startCountdown,
    chooseContinueOnline,
    choosePlayLocal,
    handleKeydown,
    cleanup
  };
}
