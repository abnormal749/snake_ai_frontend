// 定義遊戲 Canvas 繪圖所需的 CSS 變數名稱

export const PALETTE_TOKENS = {
  bg: '--color-game-bg-transparent', 
  grid: '--color-grid-line',
  
  snake: {
    head: '--color-btn-green-bg',
    body: '--color-btn-green-bg', 
    border: '--color-game-bg',
    highlight: '--color-btn-green-light',
    tongue: '--color-tree-berry'
  },
  
  food: {
    body: '--color-tree-berry',
    border: '--color-game-bg',
    leaf: '--color-grass-bg'
  },

  bomb: {
    body: '--color-bomb-body',
    fuse: '--color-bomb-fuse'
  },
  star: {
    body: '--color-star-body',
    outline: '--color-star-outline'
  }
};