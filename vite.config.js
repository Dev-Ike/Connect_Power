import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(root, 'index.html'),
                signIn: resolve(root, 'auth/sign-in.html'),
                signUp: resolve(root, 'auth/sign-up.html'),
                adminLogin: resolve(root, 'admin/admin-login.html'),
                adminDashboard: resolve(root, 'admin/admin-dashboard.html'),
                step1: resolve(root, 'pages/step1.html'),
                step2: resolve(root, 'pages/step2.html'),
                step3: resolve(root, 'pages/step3.html'),
                step4: resolve(root, 'pages/step4.html'),
                step5: resolve(root, 'pages/step5.html'),
            },
        },
    },
});