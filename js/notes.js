/**
 * notes.js — Catatan Global
 * WendStudio · Profit Kalkulator App
 */

const NotesModule = (() => {

  let allNotes = [];
  let editingNoteId = null;
  let autoSaveTimer = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  async function loadNotes() {
    // Global notes only (fileId === null)
    const all = await DB.Notes.getAll();
    allNotes = all.filter(n => !n.fileId).sort((a, b) => b.updatedAt - a.updatedAt);
    renderNotesList();
  }

  function renderNotesList() {
    const list = document.getElementById('notes-list');
    const empty = document.getElementById('notes-empty');
    list.innerHTML = '';

    if (allNotes.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    allNotes.forEach(note => {
      const div = document.createElement('div');
      div.className = 'note-card';
      div.innerHTML = `
        <div class="note-card-title">${esc(note.title || 'Tanpa Judul')}</div>
        <div class="note-card-body">${esc(note.body || '')}</div>
        <div class="note-card-date">${fmtDate(note.updatedAt)}</div>
      `;
      div.addEventListener('click', () => openNoteEdit(note.id));
      list.appendChild(div);
    });
  }

  function showListView() {
    document.getElementById('notes-list-view').classList.remove('hidden');
    document.getElementById('notes-edit-view').classList.add('hidden');
    document.getElementById('page-title').textContent = 'Catatan';
    loadNotes();
  }

  function openNoteEdit(id = null) {
    editingNoteId = id;
    const editView = document.getElementById('notes-edit-view');
    const listView = document.getElementById('notes-list-view');

    listView.classList.add('hidden');
    editView.classList.remove('hidden');

    if (id) {
      const note = allNotes.find(n => n.id === id);
      document.getElementById('note-title-input').value = note.title || '';
      document.getElementById('note-body-input').value = note.body || '';
      document.getElementById('page-title').textContent = 'Edit Catatan';
    } else {
      document.getElementById('note-title-input').value = '';
      document.getElementById('note-body-input').value = '';
      document.getElementById('page-title').textContent = 'Catatan Baru';
    }

    document.getElementById('btn-delete-note').style.display = id ? 'block' : 'none';
    setTimeout(() => document.getElementById('note-title-input').focus(), 200);
  }

  async function saveNote() {
    const title = document.getElementById('note-title-input').value.trim();
    const body = document.getElementById('note-body-input').value;
    const now = Date.now();

    if (!title && !body.trim()) { App.toast('Catatan kosong'); return; }

    if (editingNoteId) {
      const note = allNotes.find(n => n.id === editingNoteId);
      note.title = title; note.body = body; note.updatedAt = now;
      await DB.Notes.save(note);
    } else {
      const note = { id: uid(), fileId: null, title, body, createdAt: now, updatedAt: now };
      await DB.Notes.save(note);
    }
    App.toast('Catatan disimpan');
    showListView();
  }

  async function deleteNote() {
    if (!editingNoteId) return;
    App.confirm('Hapus catatan ini?', '', async () => {
      await DB.Notes.delete(editingNoteId);
      App.toast('Catatan dihapus');
      showListView();
    });
  }

  function init() {
    document.getElementById('btn-add-note').addEventListener('click', () => openNoteEdit(null));
    document.getElementById('btn-save-note').addEventListener('click', saveNote);
    document.getElementById('btn-delete-note').addEventListener('click', deleteNote);
  }

  function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function esc(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  return { init, loadNotes, showListView };
})();
