import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'

// Tell Vercel not to parse the body — svix needs the raw bytes to verify the signature
export const config = { api: { bodyParser: false } }

const SUPPORTED_EVENTS = new Set([
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
])

function supabase() {
  return createClient(
    (process.env.SUPABASE_URL || '').trim(),
    (process.env.SUPABASE_ANON_KEY || '').trim(),
  )
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  // Read the raw body before any parsing
  const rawBody = await readRawBody(req)

  // Verify the Svix signature — rejects with an error if invalid or replayed
  let payload
  try {
    const wh = new Webhook(secret)
    payload = wh.verify(rawBody, {
      'svix-id':        req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    })
  } catch {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { type, data } = payload

  if (!SUPPORTED_EVENTS.has(type)) {
    return res.status(200).json({ ok: true })
  }

  const messageId = data?.email_id
  const recipient = Array.isArray(data?.to) ? data.to[0] : data?.to
  const eventType = type.replace('email.', '')

  if (!messageId || !recipient) {
    return res.status(400).json({ error: 'Missing email_id or to' })
  }

  const db = supabase()

  const { data: sentRow } = await db
    .from('email_events')
    .select('note_id')
    .eq('message_id', messageId)
    .limit(1)
    .maybeSingle()

  await db.from('email_events').insert({
    message_id: messageId,
    note_id: sentRow?.note_id ?? null,
    recipient,
    event_type: eventType,
  })

  return res.status(200).json({ ok: true })
}
