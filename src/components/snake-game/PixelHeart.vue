<script setup>
defineProps({
  status: {
    type: String, 
    required: true
  }
});
</script>

<template>
  <svg width="24" height="24" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Outline -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="M2 0H5V1H7V0H10V1H11V2H12V5H11V6H10V7H9V8H8V9H7V10H5V9H4V8H3V7H2V6H1V5H0V2H1V1H2V0ZM2 1V2H1V5H2V6H3V7H4V8H5V9H7V8H8V7H9V6H10V5H11V2H10V1H7V2H5V1H2Z" fill="black"/>
    
    <!-- Fill -->
    <g v-if="status === 'full'">
      <rect x="2" y="1" width="3" height="1" fill="#D32F2F"/>
      <rect x="7" y="1" width="3" height="1" fill="#D32F2F"/>
      <rect x="1" y="2" width="10" height="3" fill="#D32F2F"/>
      <rect x="2" y="5" width="8" height="1" fill="#D32F2F"/>
      <rect x="3" y="6" width="6" height="1" fill="#D32F2F"/>
      <rect x="4" y="7" width="4" height="1" fill="#D32F2F"/>
      <rect x="5" y="8" width="2" height="1" fill="#D32F2F"/>
      <!-- Shine -->
      <rect x="2" y="2" width="1" height="1" fill="white"/>
    </g>
    
    <g v-else-if="status === 'half'">
      <!-- Left Red -->
      <rect x="2" y="1" width="3" height="1" fill="#D32F2F"/>
      <rect x="1" y="2" width="5" height="3" fill="#D32F2F"/>
      <rect x="2" y="5" width="4" height="1" fill="#D32F2F"/>
      <rect x="3" y="6" width="3" height="1" fill="#D32F2F"/>
      <rect x="4" y="7" width="2" height="1" fill="#D32F2F"/>
      <rect x="5" y="8" width="1" height="1" fill="#D32F2F"/>
      <!-- Right Empty -->
      <rect x="7" y="1" width="3" height="1" fill="#5D4037"/>
      <rect x="6" y="2" width="5" height="3" fill="#5D4037"/>
      <rect x="6" y="5" width="4" height="1" fill="#5D4037"/>
      <rect x="6" y="6" width="3" height="1" fill="#5D4037"/>
      <rect x="6" y="7" width="2" height="1" fill="#5D4037"/>
      <rect x="6" y="8" width="1" height="1" fill="#5D4037"/>
      <!-- Shine -->
      <rect x="2" y="2" width="1" height="1" fill="white"/>
    </g>
    
    <g v-else>
      <!-- All Empty -->
      <rect x="2" y="1" width="3" height="1" fill="#5D4037"/>
      <rect x="7" y="1" width="3" height="1" fill="#5D4037"/>
      <rect x="1" y="2" width="10" height="3" fill="#5D4037"/>
      <rect x="2" y="5" width="8" height="1" fill="#5D4037"/>
      <rect x="3" y="6" width="6" height="1" fill="#5D4037"/>
      <rect x="4" y="7" width="4" height="1" fill="#5D4037"/>
      <rect x="5" y="8" width="2" height="1" fill="#5D4037"/>
    </g>
  </svg>
</template>