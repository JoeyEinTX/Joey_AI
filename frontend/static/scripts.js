// Global state
let isAdvancedMode = false;
let isLoading = false;

// Initialize app
window.addEventListener('DOMContentLoaded', function() {
    loadPresets();
    checkOllamaHealth();
    setupEventListeners();
    
    // Check health every 30 seconds
    setInterval(checkOllamaHealth, 30000);
});

function setupEventListeners() {
    // Enter key to send
    document.getElementById('prompt').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendPrompt();
        }
    });
    
    // Range input updates
    document.getElementById('temperature').addEventListener('input', function(e) {
        document.getElementById('temperature-value').textContent = e.target.value;
    });
    
    document.getElementById('top-p').addEventListener('input', function(e) {
        document.getElementById('top-p-value').textContent = e.target.value;
    });
}

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
        document.getElementById('stat-note').textContent = stats.by_kind.note || 0;
        document.getElementById('stat-todo').textContent = stats.by_kind.todo || 0;
        document.getElementById('stat-decision').textContent = stats.by_kind.decision || 0;
        document.getElementById('stat-log').textContent = stats.by_kind.log || 0;
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
        Object.keys(groups).forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'memory-group';
            groupDiv.innerHTML = `<div class="memory-group-header">${group}</div>`;
            groups[group].forEach(note => {
                groupDiv.appendChild(mem.renderNote(note));
            });
            container.appendChild(groupDiv);
        });
    },
    renderNote: function(note) {
        const div = document.createElement('div');
        div.className = 'memory-note';
        div.innerHTML = `
            <span class="badge ${note.kind}">${note.kind}</span>
            <span class="memory-ts">${new Date(note.ts).toLocaleString()}</span>
            <span class="memory-tags">${mem.renderTags(note.tags)}</span>
            <span class="memory-text">${mem.highlight(note.text, mem.query)}</span>
            <div class="memory-actions">
                <button onclick="mem.edit(${note.id})">Edit</button>
                <button onclick="mem.delete(${note.id})">Delete</button>
                <button onclick="mem.copy('${encodeURIComponent(note.text)}')">Copy</button>
            </div>
        `;
        return div;
    },
    renderTags: function(tags) {
        if (!tags) return '';
        return tags.split(',').map(tag => `<span class="tag-chip">${tag.trim()}</span>`).join(' ');
    },
    highlight: function(text, q) {
        if (!q) return mem.codeStyle(text);
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return mem.codeStyle(text.replace(re, m => `<mark>${m}</mark>`));
    },
    codeStyle: function(text) {
        // If text looks like code, wrap in <pre>
        if (/\b(def |class |function |{.*}|\[.*\]|\=.*|\(|\);|\<\w+\>|\w+\:\w+)/.test(text)) {
            return `<pre class="memory-code">${text}</pre>`;
        }
        return text;
    },
    edit: function(id) {
        // Inline edit mode
        const note = mem.results.find(n => n.id === id);
        const composer = document.getElementById('memory-composer');
        composer.style.display = 'block';
        composer.innerHTML = `
            <input type="text" id="edit-kind" value="${note.kind}" />
            <input type="text" id="edit-tags" value="${note.tags || ''}" />
            <textarea id="edit-text">${note.text}</textarea>
            <button id="edit-save">Save</button>
            <button id="edit-cancel">Cancel</button>
        `;
        document.getElementById('edit-save').onclick = async () => {
            await mem.update({id, kind: document.getElementById('edit-kind').value, text: document.getElementById('edit-text').value, tags: document.getElementById('edit-tags').value});
            composer.style.display = 'none';
        };
        document.getElementById('edit-cancel').onclick = () => {
            composer.style.display = 'none';
        };
    },
    copy: function(text) {
        navigator.clipboard.writeText(decodeURIComponent(text));
    }
};

async function checkOllamaHealth() {
    try {
        const response = await fetch('/health/ollama');
        const data = await response.json();
        
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (data.status === 'healthy') {
            indicator.className = 'status-indicator healthy';
            statusText.textContent = `Connected (${data.response_time}s)`;
        } else {
            indicator.className = 'status-indicator unhealthy';
            statusText.textContent = 'Ollama Offline';
        }
    } catch (error) {
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        indicator.className = 'status-indicator unhealthy';
        statusText.textContent = 'Connection Error';
    }
}

function appendMessage(role, text, metadata = {}) {
    const chat = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble ' + (role === 'user' ? 'user' : 'ai');
    
    const timestamp = new Date().toLocaleTimeString();
    let metadataHtml = '';
    
    if (metadata.response_time) {
        metadataHtml += `<span class="metadata">Response time: ${metadata.response_time}s</span>`;
    }
    
    msgDiv.innerHTML = `
        <div class="chat-header">
            <span class="chat-role">${role === 'user' ? 'You' : 'AI'}</span>
            <span class="chat-time">${timestamp}</span>
        </div>
        <div class="chat-text">${text}</div>
        ${metadataHtml}
    `;
    
    chat.appendChild(msgDiv);
    chat.scrollTop = chat.scrollHeight;
}

function showLoading() {
    const chat = document.getElementById('chat-history');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.className = 'chat-bubble ai loading';
    loadingDiv.innerHTML = `
        <div class="chat-header">
            <span class="chat-role">AI</span>
        </div>
        <div class="chat-text">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chat.appendChild(loadingDiv);
    chat.scrollTop = chat.scrollHeight;
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

async function sendPrompt() {
    if (isLoading) return;
    
    const prompt = document.getElementById('prompt').value;
    if (!prompt.trim()) return;
    
    isLoading = true;
    document.getElementById('send-btn').disabled = true;
    document.getElementById('send-btn').textContent = 'Sending...';
    
    appendMessage('user', prompt);
    document.getElementById('prompt').value = '';
    
    showLoading();
    
    try {
        const endpoint = isAdvancedMode ? '/query/advanced' : '/query';
        const payload = { prompt };
        
        if (isAdvancedMode) {
            payload.temperature = parseFloat(document.getElementById('temperature').value);
            payload.max_tokens = parseInt(document.getElementById('max-tokens').value);
            payload.top_p = parseFloat(document.getElementById('top-p').value);
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        hideLoading();
        
        if (response.ok) {
            appendMessage('ai', data.response, {
                response_time: data.response_time
            });
        } else {
            appendMessage('ai', `Error: ${data.error || 'Unknown error occurred'}`);
        }
    } catch (error) {
        hideLoading();
        appendMessage('ai', `Error: ${error.message}`);
    } finally {
        isLoading = false;
        document.getElementById('send-btn').disabled = false;
        document.getElementById('send-btn').textContent = 'Send Prompt';
    }
}

async function loadPresets() {
    try {
        const response = await fetch('/presets');
        const presets = await response.json();
        const container = document.getElementById('preset-buttons');
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
