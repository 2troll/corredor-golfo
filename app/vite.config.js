import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Se publica en https://2troll.github.io/corredor-golfo/experiencia/ y usa las
// texturas del estudio, que viven un nivel más arriba (../img). La fuente está en
// app/ y el build sale a ../experiencia, que GitHub Pages sirve tal cual desde main.
export default defineConfig({
  base: '/corredor-golfo/experiencia/',
  plugins: [react()],
  build: {
    outDir: '../experiencia',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // three y el 3D van aparte: la caché del navegador los reutiliza entre versiones
        manualChunks: id => id.includes('node_modules/three') ? 'three'
          : id.includes('@react-three') ? 'r3f'
          : id.includes('gsap') || id.includes('lenis') || id.includes('framer-motion') ? 'animacion'
          : undefined,
      },
    },
  },
})
