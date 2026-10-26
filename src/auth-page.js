import { Clerk } from '@clerk/clerk-js';
import '../style.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const container = document.getElementById('auth-container');

const ROUTES = {
    signIn: '/sign-in.html',
    signUp: '/sign-up.html',
    signInSuccess: '/step2.html',
    signUpSuccess: '/sign-in.html?registered=true',
};

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

function showNotice(text) {
    const notice = document.createElement('p');
    notice.className = 'auth-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = text;
    container.before(notice);
}

async function initializeAuthPage() {
    if (!publishableKey || !container) {
        throw new Error('Missing Clerk configuration or auth container.');
    }

    await loadClerkUI(getClerkDomain(publishableKey));

    const clerk = new Clerk(publishableKey);

    await clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
        signInUrl: ROUTES.signIn,
        signUpUrl: ROUTES.signUp,
        signInForceRedirectUrl: ROUTES.signInSuccess,
        signUpForceRedirectUrl: ROUTES.signUpSuccess,
        afterSignOutUrl: ROUTES.signIn,
    });

    const params = new URLSearchParams(window.location.search);
    const justRegistered = params.get('registered') === 'true';
    const isSignUpPage = window.location.pathname.endsWith(ROUTES.signUp);

    // Clerk auto-signs users in after sign-up. End that session so the new
    // user is asked to sign in explicitly. Signing out reloads this page
    // at a clean /sign-in.html, where a sign-in form is mounted.
    if (clerk.isSignedIn && justRegistered) {
        sessionStorage.setItem('showRegisteredNotice', '1');
        await clerk.signOut({ redirectUrl: ROUTES.signIn });
        return;
    }

    // Already authenticated visitors go straight to step 2.
    if (clerk.isSignedIn) {
        window.location.replace(ROUTES.signInSuccess);
        return;
    }

    if (isSignUpPage) {
        clerk.mountSignUp(container, {
            signInUrl: ROUTES.signIn, // "Already have an account? Sign in"
            forceRedirectUrl: ROUTES.signUpSuccess,
        });
        return;
    }

    if (sessionStorage.getItem('showRegisteredNotice')) {
        sessionStorage.removeItem('showRegisteredNotice');
        showNotice('Account created successfully. Please sign in to continue.');
    }

    if (clerk.session) {
        const key = 'authRedirectedAt';
        const last = Number(sessionStorage.getItem(key) || 0);

        if (Date.now() - last < 3000) {
            console.error('Redirect loop detected. Stopping.');
            return;
        }

        sessionStorage.setItem(key, String(Date.now()));
        window.location.replace('/step2.html');
        return;
    }

    clerk.mountSignIn(container, {
        signUpUrl: ROUTES.signUp,
        forceRedirectUrl: ROUTES.signInSuccess,
    });
}

initializeAuthPage().catch((error) => {
    console.error('Authentication setup failed:', error);
    container.replaceChildren();

    const message = document.createElement('p');
    message.textContent =
        'Unable to load authentication. Check your Clerk key and network connection.';
    container.appendChild(message);
});