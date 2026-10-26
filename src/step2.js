import '../style.css';
import { getClerk } from './clerk-client.js';
import { setupLogoutButton } from './logout.js';

function showError(message) {
    document.body.hidden = false;
    const el = document.createElement('p');
    el.setAttribute('role', 'alert');
    el.textContent = message;
    document.body.prepend(el);
}

async function initializeStep2() {
    const clerk = await getClerk();

    // Redirect ONLY when we are certain the user is signed out.
    if (!clerk.session) {
        window.location.replace('/auth/sign-in.html');
        return;
    }

    document.body.hidden = false;

    try {
        await setupLogoutButton('#logout-btn');
        // ...your step 2 logic here
        // ...your step 2 logic here
        const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

        async function initializeStep2() {
            if (!publishableKey) {
                throw new Error('Add your VITE_CLERK_PUBLISHABLE_KEY to the .env file');
            }

            const clerkDomain = atob(publishableKey.split('_')[2]).replace(/\$$/, '');

            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
                script.async = true;
                script.crossOrigin = 'anonymous';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load Clerk UI.'));
                document.head.appendChild(script);
            });

            const clerk = new Clerk(publishableKey);
            await clerk.load({
                ui: { ClerkUI: window.__internal_ClerkUICtor },
                signInUrl: '/auth/sign-in.html',
                afterSignOutUrl: '/auth/sign-in.html',
            });

            if (!clerk.isSignedIn) {
                window.location.replace('/auth/sign-in.html');
                return;
            }

            document.body.hidden = false; // reveal page only for authenticated users
            // ...your step 2 logic here
        }
    } catch (error) {
        console.error('Step 2 logic failed:', error);
        showError('Something went wrong loading this page. Please refresh.');
    }
}

initializeStep2().catch((error) => {
    // Never redirect here: a signed-in user would bounce back to step 2.
    console.error('Clerk failed to initialize on step 2:', error);
    showError('Unable to verify your session. Please refresh the page.');
});