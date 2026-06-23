import { createClient } from '@supabase/supabase-js'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, data } = req.body ?? {}

  // Acknowledge but ignore events we don't track
  if (!SUPPORTED_EVENTS.has(type)) {
    return res.status(200).json({ ok: true })
  }

  const messageId = data?.email_id
  const recipient = Array.isArray(data?.to) ? data.to[0] : data?.to
  const eventType = type.replace('email.', '') // 'delivered' | 'opened' | 'clicked' | 'bounced'

  if (!messageId || !recipient) {
    return res.status(400).json({ error: 'Missing email_id or to' })
  }

  const db = supabase()

  // Resolve note_id from the original "sent" row
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
