import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                signIn: resolve(__dirname, 'sign-in.html'),
                signUp: resolve(__dirname, 'sign-up.html'),
                step2: resolve(__dirname, 'step2.html'),
            },
        },
    },
});