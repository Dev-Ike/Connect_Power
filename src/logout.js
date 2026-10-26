import { getClerk } from './clerk-client.js';

const HOME_URL = '/';

export async function setupLogoutButton(selector = '#logout-btn') {
    const button = document.querySelector(selector);
    if (!button) return;

    const clerk = await getClerk();

    button.addEventListener('click', async () => {
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Signing out...';

        try {
            await clerk.signOut({ redirectUrl: HOME_URL });
        } catch (error) {
            console.error('Sign out failed:', error);
            button.disabled = false;
            button.textContent = originalText;
            alert('Could not sign out. Please try again.');
        }
    });
}