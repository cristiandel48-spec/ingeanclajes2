import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pruebas automaticas (npm test). Corren tambien antes de cada build: si
  // una falla, Vercel no publica la version.
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
    // Las fechas se calculan en la hora del equipo; las pruebas, en la de
    // Colombia, sea cual sea la maquina donde corran.
    env: { TZ: 'America/Bogota' },
  },
})
