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
      <time>${new Date(n.created_at).toLocaleString()}</time>
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
    .insert({ title: '', content: raw, user_id: '00000000-0000-0000-0000-000000000000' })

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

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

loadNotes()
