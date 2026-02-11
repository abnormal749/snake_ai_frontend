<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

const props = defineProps({
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

const roomStats = ref({});
const SERVER_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const ROOM_STATS_POLL_MS = 2000;

let statsSocket = null;
let pollTimer = null;
let reconnectTimer = null;
let disposed = false;

const formatRoomLabel = (roomNumber, stat) => {
  if (!stat) return `${roomNumber} (讀取中)`;

  if ((stat.available_slots ?? 0) <= 0) {
    return `${roomNumber} (已滿)`;
  }

  const count = stat.display_players ?? stat.connected_players ?? 0;
  if (stat.status === 'RUNNING') {
    return `${roomNumber} (遊戲中 ${count})`;
  }

  return `${roomNumber} (等待 ${count})`;
};

const roomOptions = computed(() => {
  return props.rooms.map((roomNumber) => {
    const roomId = `room-${roomNumber}`;
    const stat = roomStats.value[roomId];
    return {
      value: roomNumber,
      label: formatRoomLabel(roomNumber, stat)
    };
  });
});

const clearTimers = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const requestRoomStats = () => {
  if (!statsSocket || statsSocket.readyState !== WebSocket.OPEN) return;
  statsSocket.send(JSON.stringify({ t: 'room_stats_req' }));
};

const scheduleReconnect = () => {
  if (disposed || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectStatsSocket();
  }, 1500);
};

const connectStatsSocket = () => {
  if (disposed) return;
  clearTimers();

  statsSocket = new WebSocket(SERVER_URL);

  statsSocket.onopen = () => {
    requestRoomStats();
    pollTimer = setInterval(requestRoomStats, ROOM_STATS_POLL_MS);
  };

  statsSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.t !== 'room_stats' || !Array.isArray(data.rooms)) return;

      const nextStats = {};
      data.rooms.forEach((room) => {
        if (room?.room_id) nextStats[room.room_id] = room;
      });
      roomStats.value = nextStats;
    } catch (e) {
      console.error('Failed to parse room stats message:', e);
    }
  };

  statsSocket.onerror = () => {
    // Let onclose handle reconnect.
  };

  statsSocket.onclose = () => {
    clearTimers();
    statsSocket = null;
    scheduleReconnect();
  };
};

onMounted(() => {
  connectStatsSocket();
});

onBeforeUnmount(() => {
  disposed = true;
  clearTimers();
  if (statsSocket) {
    statsSocket.close();
    statsSocket = null;
  }
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
            <option v-for="room in roomOptions" :key="room.value" :value="room.value">{{ room.label }}</option>
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
