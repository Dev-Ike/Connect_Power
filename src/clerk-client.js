import { Clerk } from '@clerk/clerk-js';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

let clerkPromise;

function getClerkDomain(key) {
    const encodedDomain = key.split('_')[2];
    if (!encodedDomain) throw new Error('Invalid Clerk publishable key.');
    return atob(encodedDomain).replace(/\$$/, '');
}

function loadClerkUI(clerkDomain) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Clerk UI.'));
        document.head.appendChild(script);
    });
}

export function getClerk() {
    if (!clerkPromise) {
        clerkPromise = (async () => {
            if (!publishableKey) {
                throw new Error('Add your VITE_CLERK_PUBLISHABLE_KEY to the .env file');
            }

            await loadClerkUI(getClerkDomain(publishableKey));

            const clerk = new Clerk(publishableKey);
            await clerk.load({
                ui: { ClerkUI: window.__internal_ClerkUICtor },
                signInUrl: '/sign-in.html',
                signUpUrl: '/sign-up.html',
                signInForceRedirectUrl: '/step2.html',
                signUpForceRedirectUrl: '/sign-in.html?registered=true',
                afterSignOutUrl: '/',
            });

            return clerk;
        })();
    }
    return clerkPromise;
}