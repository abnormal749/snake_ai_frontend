<script setup>
import { ref } from 'vue';
import GameMenu from '../components/snake-game/GameMenu.vue';
import GameBoard from '../components/snake-game/GameModel.vue';
import PixelCloud from '../components/snake-game/PixelCloud.vue';
import PixelTree from '../components/snake-game/PixelTree.vue';
import PixelGrass from '../components/snake-game/PixelGrass.vue';

const isPlaying = ref(false);
const userData = ref(null);

const handleStartGame = (data) => {
  userData.value = data;
  isPlaying.value = true;
};
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center select-none bg-game-bg font-vt323">
    <div class="absolute inset-0 z-0 pointer-events-none">
        <div class="h-3/4 bg-sky-dither relative overflow-hidden">
            <div v-for="n in 3" :key="n" class="absolute left-0 animate-float opacity-80" 
                 :style="{ top: (n * 15) + '%', animationDuration: (20 + n * 5) + 's', animationDelay: (n * -7) + 's' }">
                <PixelCloud />
            </div>
        </div>
        <div class="h-1/4 flex flex-col">
            <div class="h-1/4 bg-grass-bg relative border-t-4 border-wood-border">
                <div class="absolute inset-0 flex justify-around items-start pt-1 opacity-60">
                    <PixelGrass v-for="n in 12" :key="n" class="scale-125" />
                </div>
            </div>
            <div class="h-3/4 bg-soil-pattern relative opacity-90"></div>
        </div>
        <div class="absolute bottom-[20%] left-[2%] z-10 scale-[2.5]">
            <PixelTree />
        </div>
        <div class="absolute bottom-[22%] left-[10%] z-10 scale-[2.2] opacity-90">
            <PixelTree />
        </div>       
        <div class="absolute bottom-[20%] right-[2%] z-10 scale-[2.5]">
            <PixelTree />
        </div>
        <div class="absolute bottom-[22%] right-[10%] z-10 scale-[2.2] opacity-90">
            <PixelTree />
        </div>
    </div>
    <div class="z-20 flex flex-col items-center">
        <div v-if="!isPlaying" class="flex flex-col items-center gap-8">
            <h1 class="text-6xl md:text-8xl c-text-title mb-8 text-center leading-tight">
                SNAKE
            </h1>
            <GameMenu @start="handleStartGame" />
        </div>
        <GameBoard v-else :user-data="userData" @back="isPlaying = false" />
    </div>
  </div>
</template>