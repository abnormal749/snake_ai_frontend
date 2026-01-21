<script setup>
import { reactive } from 'vue';

defineProps({
  rooms: {
    type: Array,
    default: () => Array.from({ length: 20 }, (_, i) => i + 1)
  }
});

const emit = defineEmits(['start']);

const form = reactive({
  name: 'HERO',
  roomId: 1,
  mode: 1 
});

const handleStart = () => {
  if (!form.name) {
    alert("請輸入名字 (Please enter name)");
    return;
  }
  emit('start', { ...form });
};
</script>

<template>
  <div class="c-panel-wood p-6 flex flex-col gap-4 w-80">
    <label class="text-xl text-text-primary mb-1 font-bold">PLAYER NAME</label>
    <input 
        type="text" 
        v-model="form.name"
        class="c-input-game"
        maxlength="10"
    >
    <div class="grid grid-cols-2 gap-2 mt-2">
       <div>
         <label class="text-sm text-text-primary font-bold">ROOM</label>
         <select v-model="form.roomId" class="c-select-game">
            <option v-for="r in rooms" :key="r" :value="r">{{ r }}</option>
         </select>
       </div>
       <div>
         <label class="text-sm text-text-primary font-bold">MODE</label>
         <select v-model="form.mode" class="c-select-game">
            <option value="1" selected="true">DQN</option>
            <option value="2">NEAT(開發中)</option>
            <option value="3">BFS(開發中)</option>
         </select>
       </div>
    </div>
    
    <button 
        @click="handleStart"
        class="mt-4 c-btn-game"
    >
        START GAME
    </button>
  </div>
</template>