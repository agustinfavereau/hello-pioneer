import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const APP_URL = 'https://hello-pioneer-khaki.vercel.app'

function supabase() {
  return createClient(
    (process.env.SUPABASE_URL || '').trim(),
    (process.env.SUPABASE_ANON_KEY || '').trim(),
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { content, recipientEmail, noteId } = req.body ?? {}

  if (!content || !recipientEmail) {
    return res.status(400).json({ error: 'Missing content or recipientEmail' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    // Update "from" to a verified domain in Resend dashboard for production.
    from: 'Pioneer Notes <onboarding@resend.dev>',
    to: recipientEmail,
    subject: 'Someone shared a note with you',
    html: buildEmail(content),
    tags: noteId ? [{ name: 'note_id', value: noteId }] : [],
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Record the "sent" event so the webhook can later look up note_id by message_id
  if (noteId && data?.id) {
    await supabase().from('email_events').insert({
      message_id: data.id,
      note_id: noteId,
      recipient: recipientEmail,
      event_type: 'sent',
    })
  }

  return res.status(200).json({ ok: true })
}

function buildEmail(content) {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>A note from Pioneer Notes</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#888;">
                Pioneer Notes
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e8e8e4;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#aaa;">
                Shared note
              </p>
              <p style="margin:0;font-size:16px;line-height:1.65;color:#1a1a1a;">
                ${escaped}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <a href="${APP_URL}"
                 style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;
                        font-size:14px;font-weight:500;padding:12px 28px;border-radius:8px;">
                Open Pioneer Notes
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#bbb;">
                Sent via <a href="${APP_URL}" style="color:#bbb;">Pioneer Notes</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
