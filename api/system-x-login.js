const { sign } = require('./_lib/auth');

const MAGIC_TOKEN_TTL_MS = 8 * 60 * 1000; // 8 minutes — short-lived, stateless

function getAllowedEmails() {
  return (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function sendPrimaryEmail(magicLink, allowedEmails) {
  // Reuses the same free, no-signup FormSubmit relay already used for the
  // feedback form. Sends the magic link to every allowed address. Throws if
  // the network call itself fails, which the caller uses to trigger fallback.
  const results = await Promise.all(
    allowedEmails.map((email) =>
      fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: 'System X — your login link (expires in 8 minutes)',
          message: `Your System X login link: ${magicLink}\n\nThis link expires in 8 minutes and can only be used once.`,
        }),
      })
    )
  );
  const allOk = results.every((r) => r.ok);
  if (!allOk) throw new Error('Email dispatch failed');
}

async function tryWhatsappApiSend(magicLink) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const adminPhone = process.env.ADMIN_PHONE;
  if (!token || !phoneNumberId || !templateName || !adminPhone) {
    return false; // Not configured — this is optional, not required
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: adminPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: magicLink }],
            },
          ],
        },
      }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function buildWhatsappClickLink(magicLink) {
  const adminPhone = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
  if (!adminPhone) return null;
  const text = encodeURIComponent(`System X login link (expires in 8 min): ${magicLink}`);
  return `https://wa.me/${adminPhone}?text=${text}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const email = String((body && body.email) || '').trim().toLowerCase();
  const phone = String((body && body.phone) || '').replace(/\D/g, '');

  const allowedEmails = getAllowedEmails();
  const adminPhone = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');

  if (!allowedEmails.length || !adminPhone) {
    res.status(500).json({ error: 'Server is not configured (ALLOWED_EMAILS / ADMIN_PHONE missing)' });
    return;
  }

  const emailOk = allowedEmails.includes(email);
  const phoneOk = phone === adminPhone;

  if (!emailOk || !phoneOk) {
    res.status(401).json({ error: 'Please try again, wrong number or wrong email' });
    return;
  }

  try {
    const origin = `https://${req.headers.host}`;
    const magicToken = sign({ purpose: 'magic-login', exp: Date.now() + MAGIC_TOKEN_TTL_MS });
    const magicLink = `${origin}/admin/?magic=${magicToken}`;

    try {
      await sendPrimaryEmail(magicLink, allowedEmails);
      res.status(200).json({ status: 'sent-primary', message: 'Login link sent to your email.' });
      return;
    } catch (emailError) {
      // Primary failed — fallback mode
      const whatsappApiSent = await tryWhatsappApiSend(magicLink);
      const whatsappClickLink = buildWhatsappClickLink(magicLink);
      res.status(200).json({
        status: 'fallback',
        whatsappApiSent,
        whatsappClickLink,
        message: whatsappApiSent
          ? 'Email failed, but the login link was sent via WhatsApp.'
          : 'Email failed. Tap the WhatsApp button to get your login link.',
      });
      return;
    }
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
};
