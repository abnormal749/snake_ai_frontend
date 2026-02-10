<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { PALETTE_TOKENS } from '../../utils/gamePalette.js';
import PixelHeart from './PixelHeart.vue';

import { useLocalGame } from '../../composables/useLocalGame.js';
import { useOnlineGame } from '../../composables/useOnlineGame.js';
import { useGameRender } from '../../composables/useGameRender.js';
import { useGameController } from '../../composables/useGameController.js';

const props = defineProps({
  userData: { type: Object, required: true }
});

const canvasRef = ref(null);
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
let animationFrameId = null;
let frameCount = 0;

const localGame = useLocalGame();
const onlineGame = useOnlineGame();
const renderGame = useGameRender();

const controller = useGameController(localGame, onlineGame, props);

const { localState, localScore, resetLocalGame, updateLocalGame, spawnItem } = localGame;
const { onlineGameState, onlineScore } = onlineGame;
const { resolvePalette, render } = renderGame;
const { 
  gameMode, countdown, showModeMenu, toastMessage,
  startCountdown, chooseContinueOnline, choosePlayLocal, handleKeydown, cleanup 
} = controller;

const renderLoop = () => {
  frameCount++;
  if (gameMode.value === 'CONNECTING' || gameMode.value === 'LOCAL') {
    if (localState.status === 'PLAYING' && frameCount % 10 === 0) {
      updateLocalGame(gameMode.value);
    }
  }
  render(canvasRef.value, gameMode.value, localState, onlineGameState, frameCount, countdown.value);
  animationFrameId = requestAnimationFrame(renderLoop);
};

const currentScore = computed(() => 
  gameMode.value === 'ONLINE' ? onlineScore.value : localScore.value
);

onMounted(() => {
  resolvePalette(PALETTE_TOKENS);
  spawnItem('food');
  startCountdown();
  renderLoop();
});

useEventListener(window, 'keydown', handleKeydown);

onUnmounted(() => {
  cleanup();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div class="relative z-20 flex flex-col items-center">
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
        <span v-if="gameMode === 'LOCAL'" class="ml-2 text-green-400">LOCAL</span>
        <span v-if="gameMode === 'ONLINE'" class="ml-2 text-blue-400">
          ONLINE ({{ Object.keys(onlineGameState.snakes).length }}人)
        </span>
        <span v-if="gameMode === 'CONNECTING'" class="ml-2 text-yellow-400">⏰ {{ countdown }}s</span>
      </div>
    </div>

    <div class="c-game-area">
      <canvas ref="canvasRef" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT"
        class="block cursor-none rendering-pixelated"></canvas>

      <div v-if="localState.status === 'GAMEOVER' && gameMode === 'LOCAL'"
        class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-50">
        <h2 class="text-6xl c-text-title mb-4">GAME OVER</h2>
        <div class="text-2xl mb-8 font-vt323">SCORE: {{ localScore.value }}</div>
        <button @click="resetLocalGame" class="c-btn-game">RESTART</button>
      </div>

      <div v-if="toastMessage" 
           class="absolute top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-lg font-vt323 text-xl shadow-lg z-40 transition-opacity duration-500">
        {{ toastMessage }}
      </div>

      <div v-if="showModeMenu"
        class="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50">
        <h2 class="text-5xl c-text-title mb-6">GAME FINISHED</h2>
        <div class="text-xl mb-8 font-vt323">Choose your next mode:</div>
        
        <div class="flex flex-col gap-4">
          <button @click="chooseContinueOnline(onlineGameState, onlineScore)" class="c-btn-game">
            CONTINUE ONLINE
          </button>
          <button @click="choosePlayLocal" class="c-btn-game">
            PLAY LOCAL
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
