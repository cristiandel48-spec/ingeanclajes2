import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'

// Mapas de caracteres y fuentes estandar de pdf.js, servidos desde el propio
// sitio en /pdfjs/ (hallazgo R6). Antes se pedian a cdn.jsdelivr.net: si ese
// servicio fallaba o estaba bloqueado en la red de la empresa, fallaba la
// lectura de PDF. Se copian de node_modules al compilar, asi que siempre
// coinciden con la version instalada.
const PDFJS = resolve('node_modules/pdfjs-dist')
const CARPETAS_PDFJS = ['cmaps', 'standard_fonts']

function archivosPdfJs() {
  return [
    {
      name: 'archivos-pdfjs:servir',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/pdfjs', (req, res, next) => {
          const ruta = normalize(decodeURIComponent((req.url || '').split('?')[0]))
          const [carpeta] = ruta.split(/[\\/]/).filter(Boolean)
          const archivo = join(PDFJS, ruta)
          if (!CARPETAS_PDFJS.includes(carpeta) || !archivo.startsWith(PDFJS) || !existsSync(archivo) || !statSync(archivo).isFile()) return next()
          createReadStream(archivo).pipe(res)
        })
      },
    },
    {
      name: 'archivos-pdfjs:copiar',
      apply: 'build',
      closeBundle() {
        for (const carpeta of CARPETAS_PDFJS) {
          cpSync(join(PDFJS, carpeta), resolve('dist/pdfjs', carpeta), { recursive: true })
        }
      },
    },
  ]
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), archivosPdfJs()],
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
