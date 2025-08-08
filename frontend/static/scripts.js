// Global state
let isAdvancedMode = false;
let isLoading = false;

// Initialize app

window.addEventListener('DOMContentLoaded', function() {
  loadPresets();
  // setupEventListeners(); // Only if needed for memory UI
  // Remove checkOllamaHealth (function missing)
});


// Remove setupEventListeners and sendPrompt logic (old chat)

// Memory namespace and UI logic
const mem = {
    page: 1,
    pageSize: 25,
    query: '',
    kind: '',
    tags: '',
    isLoading: false,
    debounceTimer: null,
    results: [],
    fetchStats: async function() {
        const res = await fetch('/memory/stats');
        const stats = await res.json();
  const statNote = document.getElementById('stat-note');
  if (statNote) statNote.textContent = stats.by_kind.note || 0;
  const statTodo = document.getElementById('stat-todo');
  if (statTodo) statTodo.textContent = stats.by_kind.todo || 0;
  const statDecision = document.getElementById('stat-decision');
  if (statDecision) statDecision.textContent = stats.by_kind.decision || 0;
  const statLog = document.getElementById('stat-log');
  if (statLog) statLog.textContent = stats.by_kind.log || 0;
    },
    search: function(q, kind, tags) {
        clearTimeout(mem.debounceTimer);
        mem.debounceTimer = setTimeout(async () => {
            mem.page = 1;
            mem.query = q;
            mem.kind = kind;
            mem.tags = tags;
            mem.isLoading = true;
            const res = await fetch(`/memory/search?q=${encodeURIComponent(q)}&kind=${encodeURIComponent(kind)}&tags=${encodeURIComponent(tags)}&page=1`);
            const notes = await res.json();
            mem.results = notes;
            mem.renderResults();
            mem.isLoading = false;
        }, 300);
    },
    recent: async function(page = 1) {
        mem.page = page;
        const res = await fetch(`/memory/recent?page=${page}`);
        const notes = await res.json();
        if (page === 1) mem.results = notes;
        else mem.results = mem.results.concat(notes);
        mem.renderResults();
    },
    add: async function(kind, text, tags) {
        const res = await fetch('/memory/add', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({kind, text, tags})
        });
        const note = await res.json();
        mem.recent(1);
        mem.fetchStats();
    },
    update: async function(note) {
        const res = await fetch('/memory/update', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(note)
        });
        await res.json();
        mem.recent(1);
        mem.fetchStats();
    },
    delete: async function(id) {
        await fetch(`/memory/delete?id=${id}`, {method: 'DELETE'});
        mem.recent(1);
        mem.fetchStats();
    },
    export: async function() {
        const res = await fetch('/memory/export');
        const notes = await res.json();
        const blob = new Blob([JSON.stringify(notes, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memory_export.json';
        a.click();
        URL.revokeObjectURL(url);
    },
    import: async function(file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const notes = JSON.parse(e.target.result);
            await fetch('/memory/import', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(notes)
            });
            mem.recent(1);
            mem.fetchStats();
        };
        reader.readAsText(file);
    },
    renderResults: function() {
  const container = document.getElementById('memory-results');
  if (!container) return;
  container.innerHTML = '';
        // Group by date
        const groups = {};
        const now = new Date();
        mem.results.forEach(note => {
            const ts = new Date(note.ts);
            let group = 'Older';
            if (ts.toDateString() === now.toDateString()) group = 'Today';
            else if ((now - ts) < 86400000 * 2 && ts.toDateString() === new Date(now - 86400000).toDateString()) group = 'Yesterday';
            else if ((now - ts) < 86400000 * 7) group = 'This Week';
            if (!groups[group]) groups[group] = [];
            groups[group].push(note);
        });


        // Example: render each group (implement as needed)
        // Object.keys(groups).forEach(group => {
        //   // render group header and notes
        // });
    }
  // <-- Add closing brace for mem object here
}

async function loadPresets() {
    try {
        const response = await fetch('/presets');
        const presets = await response.json();
  const container = document.getElementById('preset-buttons');
  if (!container) return;
  container.innerHTML = '';
        
        presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.innerText = preset.name;
            btn.onclick = () => {
                document.getElementById('prompt').value = preset.text;
                document.getElementById('prompt').focus();
            };
            container.appendChild(btn);
        });
    } catch (error) {
        console.error('Failed to load presets:', error);
    }
}

function toggleAdvanced() {
    isAdvancedMode = !isAdvancedMode;
    const controls = document.getElementById('advanced-controls');
    const btn = document.getElementById('advanced-btn');
    
    if (isAdvancedMode) {
        controls.style.display = 'block';
        btn.textContent = 'Simple';
        btn.classList.add('active');
    } else {
        controls.style.display = 'none';
        btn.textContent = 'Advanced';
        btn.classList.remove('active');
    }
}

function clearChat() {
    const chat = document.getElementById('chat-history');
    chat.innerHTML = '';
}

// Memory UI event listeners
window.addEventListener('DOMContentLoaded', function() {
    mem.fetchStats();
    mem.recent(1);
    document.getElementById('memory-search').addEventListener('input', e => {
        mem.search(e.target.value, document.getElementById('memory-kind-filter').value, document.getElementById('memory-tag-filter').value);
    });
    document.getElementById('memory-kind-filter').addEventListener('change', e => {
        mem.search(document.getElementById('memory-search').value, e.target.value, document.getElementById('memory-tag-filter').value);
    });
    document.getElementById('memory-tag-filter').addEventListener('input', e => {
        mem.search(document.getElementById('memory-search').value, document.getElementById('memory-kind-filter').value, e.target.value);
    });
    document.getElementById('memory-new-btn').addEventListener('click', () => {
        const composer = document.getElementById('memory-composer');
        composer.style.display = 'block';
        composer.innerHTML = `
            <input type="text" id="new-kind" placeholder="Kind (note, todo, decision, log)" />
            <input type="text" id="new-tags" placeholder="Tags (comma-separated)" />
            <textarea id="new-text" placeholder="Text"></textarea>
            <button id="new-save">Add</button>
            <button id="new-cancel">Cancel</button>
        `;
        document.getElementById('new-save').onclick = async () => {
            await mem.add(document.getElementById('new-kind').value, document.getElementById('new-text').value, document.getElementById('new-tags').value);
            composer.style.display = 'none';
        };
        document.getElementById('new-cancel').onclick = () => {
            composer.style.display = 'none';
        };
    });
    document.getElementById('memory-export-btn').addEventListener('click', () => mem.export());
    document.getElementById('memory-import-input').addEventListener('change', e => {
        if (e.target.files.length) mem.import(e.target.files[0]);
    });
    document.getElementById('memory-load-more').addEventListener('click', () => {
        mem.page += 1;
        mem.recent(mem.page);
    });
});

// Auto-save Chats toggle logic
async function fetchAutoSaveChats() {
    // Try to get config from backend (config.py flag)
    try {
        const res = await fetch('/presets');
        const data = await res.json();
        if ('autoSaveChats' in data) {
            document.getElementById('autosave-chats-toggle').checked = !!data.autoSaveChats;
        } else {
            document.getElementById('autosave-chats-toggle').checked = true;
        }
    } catch {
        document.getElementById('autosave-chats-toggle').checked = true;
    }
}
async function setAutoSaveChats(enabled) {
    // POST to /presets with updated autoSaveChats flag
    await fetch('/presets', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({autoSaveChats: enabled})
    });
}
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    fetchAutoSaveChats();
    document.getElementById('autosave-chats-toggle').addEventListener('change', function(e) {
        setAutoSaveChats(e.target.checked);
    });
});

// --- Projects/Conversations & Chat State ---
const state = {
    conversations: [],
    currentConversationId: null,
    currentMessages: [],
    searchResults: {},
    isRenaming: false,
    currentTitle: ''
};

const api = {
    async fetchMessages(conversationId) {
        const res = await fetch(`/conversations/${conversationId}/messages?limit=200&order=asc`);
        const data = await res.json();
        return data.messages || [];
    },
    async sendMessage(conversationId, content) {
        const res = await fetch(`/conversations/${conversationId}/message`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({content})
        });
        const data = await res.json();
        return data;
    },
    async renameConversation(id, title) {
        await fetch(`/conversations/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title})
        });
    },
    async deleteConversation(id) {
        await fetch(`/conversations/${id}`, {method: 'DELETE'});
    }
};

const conversations = {
    async fetchList() {
        const res = await fetch('/conversations');
        state.conversations = await res.json();
        renderProjectList();
        if (!state.currentConversationId && state.conversations.length) {
            selectConversation(state.conversations[0].id);
        }
        if (state.conversations.length === 0) {
            await conversations.create();
        }
    },
    async create(title) {
        const res = await fetch('/conversations', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title: title || ''})
        });
        const conv = await res.json();
        await conversations.fetchList();
        selectConversation(conv.id);
    },
    async rename(id, title) {
        await fetch(`/conversations/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title})
        });
        await conversations.fetchList();
    },
    async delete(id) {
        await fetch(`/conversations/${id}`, {method: 'DELETE'});
        await conversations.fetchList();
        if (state.conversations.length) selectConversation(state.conversations[0].id);
    }
};

const chat = {
    async fetchMessages(conversationId) {
        const res = await fetch(`/conversations/${conversationId}/messages?limit=200&order=asc`);
        state.currentMessages = await res.json();
        renderChatMessages();
    },
    async send(conversationId, content) {
        if (!content.trim()) return;
        const res = await fetch(`/conversations/${conversationId}/message`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({content})
        });
        const data = await res.json();
        await chat.fetchMessages(conversationId);
        scrollChatToBottom();
    }
};

const search = {
    async run(q) {
        if (!q.trim()) return;
        const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
        state.searchResults = await res.json();
        renderSearchResults();
    }
};

function selectConversation(id) {
    state.currentConversationId = id;
    chat.fetchMessages(id);
    highlightActiveProject(id);
    updateChatTitle(id);
}

function renderProjectList() {
  const list = document.getElementById('project-list');
  list.innerHTML = '';
  state.conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'project-item' + (conv.id === state.currentConversationId ? ' active' : '');
    item.innerHTML = `<span class="project-title">${conv.title || 'Untitled'}</span>
      <span class="project-updated">${new Date(conv.updated_at).toLocaleString()}</span>`;
    item.onclick = () => selectConversation(conv.id);
    list.appendChild(item);
  });
}
function appendAssistantBubble(text) {
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.textContent = text;
  chatScroll.appendChild(div);
}
function renderMessages(msgs) {
  chatScroll.innerHTML = msgs.map(m => `<div class="msg ${m.role}">${escapeHtml(m.content)}</div>`).join('');
}

chatInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
  }
});
document.getElementById('clear-btn').onclick = () => {
  chatScroll.innerHTML = '';
};
document.addEventListener('DOMContentLoaded', () => {
  setCollapsed();
  emptyState.classList.add('show');
});

// --- Memory Modal Logic ---
const memoryModal = document.getElementById('memoryModal');
const memoryBtn = document.getElementById('btnMemory');
const memoryClose = document.getElementById('memoryModalClose');
const memoryQuery = document.getElementById('memoryQuery');
const memorySearchBtn = document.getElementById('memorySearchBtn');
const memoryResults = document.getElementById('memoryResults');

function openMemoryModal() {
  memoryModal.classList.remove('hidden');
  memoryModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => memoryQuery?.focus(), 0);
}
function closeMemoryModal() {
  memoryModal.classList.add('hidden');
  memoryModal.setAttribute('aria-hidden', 'true');
}
memoryBtn?.addEventListener('click', openMemoryModal);
memoryClose?.addEventListener('click', closeMemoryModal);
memoryModal?.addEventListener('click', (e) => {
  if (e.target === memoryModal) closeMemoryModal();
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openMemoryModal(); }
  if (e.key === 'Escape') closeMemoryModal();
});

async function searchMemory(q) {
  const res = await fetch(`/memory/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || data || [];
}

async function performMemorySearch() {
  const q = memoryQuery.value.trim();
  if (!q) { memoryResults.innerHTML = '<div class="muted">Type something to search…</div>'; return; }
  memoryResults.innerHTML = '<div class="muted">Searching…</div>';
  const results = await searchMemory(q);
  if (!results.length) { memoryResults.innerHTML = '<div class="muted">No results.</div>'; return; }
  memoryResults.innerHTML = results.map(r => {
    const ts = r.ts || '';
    const kind = r.kind || 'note';
    const text = r.text || '';
    const snippet = text.length > 240 ? text.slice(0, 240) + '…' : text;
    const safeId = r.id ?? (window.crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    return `
      <div class="result-item" data-id="${safeId}">
        <div class="result-meta">
          <span class="badge">${kind}</span>
          <span>${ts}</span>
        </div>
        <div class="result-snippet">${snippet.replace(/</g,'&lt;')}</div>
        <div class="result-actions">
          <button class="btn btn-sm" data-action="toggle">View raw</button>
          <button class="btn btn-sm" data-action="copy">Copy text</button>
        </div>
        <pre class="result-text hidden">${text.replace(/</g,'&lt;')}</pre>
      </div>
    `;
  }).join('');
}
memorySearchBtn?.addEventListener('click', performMemorySearch);
memoryQuery?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performMemorySearch();
});
memoryResults?.addEventListener('click', (e) => {
  const item = e.target.closest('.result-item');
  if (!item) return;
  const textEl = item.querySelector('.result-text');
  if (e.target.matches('[data-action="toggle"]')) {
    textEl.classList.toggle('hidden');
  } else if (e.target.matches('[data-action="copy"]')) {
    navigator.clipboard.writeText(textEl.textContent || '');
  }
});

// --- New Chat UI Logic ---

function safe(el, name){
  if(!el){ console.error('Missing element:', name); }
  return el;
}

// Only declare these once at the top of the chat logic
if (!window._chatVarsDeclared) {
  window._chatVarsDeclared = true;
  var chatArea    = safe(document.getElementById('chatArea'), 'chatArea');
  var messagesEl  = safe(document.getElementById('messages'), 'messages');
  var composerEl  = safe(document.getElementById('composer'), 'composer');
  var promptInput = safe(document.getElementById('promptInput'), 'promptInput');
  var sendBtn     = safe(document.getElementById('sendBtn'), 'sendBtn');
}

function escapeHtml(s=''){ return s.replace(/[&<>"]|'/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function autoScroll(){ messagesEl.scrollTop = messagesEl.scrollHeight; }


function appendBubble(role, content){
  console.log('Appending bubble:', role, content);
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = escapeHtml(content);
  messagesEl.appendChild(div);
}

async function ensureConversationId(){
  if (!window.state) window.state = {};
  if (!state.currentConversationId) {
    if (window.api?.createConversation) {
      const conv = await window.api.createConversation({ title: '' });
      state.currentConversationId = conv.id;
      state.currentTitle = '';
    } else {
      state.currentConversationId = state.currentConversationId || 'temp';
    }
  }
  return state.currentConversationId;
}

async function sendMessageToBackend(conversationId, text){
  if (window.api?.sendMessage) {
    return await window.api.sendMessage(conversationId, text);
  }
  const res = await fetch(`/conversations/${conversationId}/message`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ content: text })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function autoTitleIfNeeded(firstUserText){
  if (!window.state) return;
  const titleMissing = !state.currentTitle || /^untitled$/i.test(state.currentTitle.trim());
  if (!titleMissing) return;
  const title = firstUserText.replace(/\s+/g,' ').trim().split(' ').slice(0,10).join(' ');
  state.currentTitle = title;
  if (window.api?.renameConversation && state.currentConversationId && state.currentConversationId !== 'temp') {
    window.api.renameConversation(state.currentConversationId, title).catch(()=>{});
  }
  if (window.updateSidebarTitle) window.updateSidebarTitle(state.currentConversationId, title);
  const titleBar = document.getElementById('chatTitleBar');
  if (titleBar) titleBar.classList.remove('hidden');
}

async function handleSend(e){
  e?.preventDefault?.();
  const text = (promptInput.value || '').trim();
  if (!text) return;
  sendBtn.disabled = true;
  if (chatArea.classList.contains('start')) {
    chatArea.classList.remove('start');
    chatArea.classList.add('active');
  }
  appendBubble('user', text);
  autoScroll();
  try {
    const convId = await ensureConversationId();
    const data = await sendMessageToBackend(convId, text);
    const reply = data?.reply ?? '(No reply)';
    appendBubble('assistant', reply);
    autoTitleIfNeeded(text);
    autoScroll();
  } catch (err) {
    appendBubble('assistant', `Error calling model: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
    promptInput.value = '';
    promptInput.focus();
  }
}


document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: wiring chat events');
  if (composerEl) composerEl.addEventListener('submit', handleSend);
  if (promptInput) promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  });
});
