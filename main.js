import { createClient } from '@supabase/supabase-js'

const supabase = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__)

const list = document.getElementById('notes-list')
const form = document.getElementById('note-form')
const textarea = document.getElementById('note-content')
const status = document.getElementById('status')

async function loadNotes() {
  list.innerHTML = '<li class="loading">Loading…</li>'
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    list.innerHTML = `<li class="error">Failed to load notes: ${error.message}</li>`
    return
  }

  if (!data.length) {
    list.innerHTML = '<li class="empty">No notes yet. Write the first one.</li>'
    return
  }

  list.innerHTML = data.map(n => `
    <li class="note">
      ${n.title ? `<strong>${escapeHtml(n.title)}</strong>` : ''}
      <p>${escapeHtml(n.content)}</p>
      <div class="note-footer">
        <time>${new Date(n.created_at).toLocaleString()}</time>
        <button class="share-btn" data-content="${escapeHtml(n.content)}">Share via email</button>
      </div>
    </li>
  `).join('')
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const raw = textarea.value.trim()
  if (!raw) return

  const submitBtn = form.querySelector('button[type="submit"]')
  submitBtn.disabled = true
  status.textContent = ''

  const { error } = await supabase
    .from('notes')
    .insert({ title: '', content: raw })

  submitBtn.disabled = false

  if (error) {
    status.textContent = `Error: ${error.message}`
    status.className = 'error'
    return
  }

  textarea.value = ''
  status.textContent = 'Note saved.'
  status.className = 'success'
  await loadNotes()
})

list.addEventListener('click', async (e) => {
  const btn = e.target.closest('.share-btn')
  if (!btn) return

  const content = btn.dataset.content
  const recipientEmail = window.prompt('Enter the recipient\'s email address:')
  if (!recipientEmail) return

  btn.disabled = true
  btn.textContent = 'Sending…'

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, recipientEmail }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to send')
    btn.textContent = 'Sent!'
    setTimeout(() => {
      btn.textContent = 'Share via email'
      btn.disabled = false
    }, 3000)
  } catch (err) {
    alert(`Could not send: ${err.message}`)
    btn.textContent = 'Share via email'
    btn.disabled = false
  }
})

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

loadNotes()
