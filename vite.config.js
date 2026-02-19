import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        port: 5173,
        host: true
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        }
    },
    optimizeDeps: {
        include: ['phaser']
    }
});
