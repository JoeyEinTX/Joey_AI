// Neon theme chat UI logic
document.addEventListener('DOMContentLoaded', () => {
  // Layout elements
  const chatArea    = document.getElementById('chatArea');
  const messagesEl  = document.getElementById('messages');
  const logoHero    = document.getElementById('logoHero');
  const composer    = document.getElementById('composer');
  const promptInput = document.getElementById('promptInput');
  const sendBtn     = document.getElementById('sendBtn');
  const clearBtn    = document.getElementById('clearBtn');

  function showPoster(show) {
    if (!logoHero) return;
    logoHero.style.opacity   = show ? '1' : '0';
    logoHero.style.transform = show ? 'translateY(0)' : 'translateY(-8px)';
  }
  function toStartLayout(){
    chatArea.classList.remove('active');
    chatArea.classList.add('start');
    showPoster(true);
  }
  function toActiveLayout(){
    chatArea.classList.remove('start');
    chatArea.classList.add('active');
    showPoster(false);
  }
  function appendBubble(role, content){
    const d = document.createElement('div');
    d.className = `msg ${role}`;
    d.textContent = content;
    messagesEl.appendChild(d);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Initial layout
  toStartLayout();

  // Send logic
  async function handleSend(e){
    e?.preventDefault?.();
    const text = (promptInput.value || '').trim();
    if (!text) return;
    if (chatArea.classList.contains('start')) toActiveLayout();
    appendBubble('user', text);
    promptInput.value = '';
    setTimeout(() => { appendBubble('assistant', '…model reply…'); }, 250);
  }
  composer?.addEventListener('submit', handleSend);
  promptInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  });

  // Clear chat
  clearBtn?.addEventListener('click', () => {
    messagesEl.innerHTML = '';
    toStartLayout();
  });

  // Memory modal logic
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
});
