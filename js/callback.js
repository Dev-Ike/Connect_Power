// Confirms a Paystack payment when the user returns to the site.
  let B = null;
  try { B = await import('./backend.js'); } catch (e) { B = null; }
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const reference = q.get('reference') || q.get('trxref');

  function show(title, msg, link, label, done) {
    $('sp').hidden = true; $('t').textContent = title; $('m').textContent = msg;
    if (reference) { $('r').hidden = false; $('r').textContent = 'Reference: ' + reference; }
    if (link) { $('go').hidden = false; $('go').href = link; $('go').textContent = label; }
  }

  if (!reference) {
    show('No payment found', 'We could not find a payment reference on this page.', './#step6', 'Back to payment');
  } else if (!B || !B.configured) {
    show('Not connected', 'The site is not connected to Supabase yet.', './#home', 'Go to home page');
  } else {
    const unsub = B.onAuth(async (user) => {
      unsub();
      if (!user) { show('Please log in', 'Log in again to confirm your payment. Your payment is safe.', './#signin', 'Log in'); return; }
      try {
        let r = await B.verifyPayment(reference);
        // The bank can take a few seconds to confirm. Try a few more times.
        for (let i = 0; i < 4 && r.status === 'pending'; i++) {
          await new Promise((ok) => setTimeout(ok, 2500));
          r = await B.verifyPayment(reference);
        }
        if (r.status === 'success') {
          show('Payment confirmed', 'Thank you. Taking you to your acknowledgement slip…', './#slip', 'View my slip');
          setTimeout(() => { location.replace('./#slip'); }, 1500);
        } else if (r.status === 'pending') {
          show('Still confirming', 'Your payment is still being confirmed. Your slip will appear in a few minutes.', './#step6', 'Back to payment');
        } else {
          show('Payment not completed', 'The payment was not completed, so you have not been charged. You can try again.', './#step6', 'Try again');
        }
      } catch (e) {
        show('We could not confirm yet', (e && e.message) ? e.message : 'Please try again in a moment.', './#step6', 'Back to payment');
      }
    });
  }
