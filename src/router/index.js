import { createRouter, createWebHistory } from 'vue-router'
import SnakeGameView from '../views/SnakeGameView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'snake-game',
      component: SnakeGameView
    }
  ],
})

export default router
