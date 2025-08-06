

function appendMessage(role, text) {
    const chat = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble ' + (role === 'user' ? 'user' : 'ai');
    const timestamp = new Date().toLocaleTimeString();
    msgDiv.innerHTML = `<span class="chat-role">${role === 'user' ? 'You' : 'AI'}</span><span class="chat-time">${timestamp}</span><div class="chat-text">${text}</div>`;
    chat.appendChild(msgDiv);
    chat.scrollTop = chat.scrollHeight;
}

async function sendPrompt() {
    const prompt = document.getElementById('prompt').value;
    if (!prompt.trim()) return;
    appendMessage('user', prompt);
    document.getElementById('prompt').value = '';
    const res = await fetch('/query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt})
    });
    const data = await res.json();
    appendMessage('ai', data.response);
}

async function loadPresets() {
    const res = await fetch('/presets');
    const presets = await res.json();
    const container = document.getElementById('preset-buttons');
    container.innerHTML = '';
    presets.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.innerText = preset.name;
        btn.onclick = () => {
            document.getElementById('prompt').value = preset.text;
        };
        container.appendChild(btn);
    });
}

window.addEventListener('DOMContentLoaded', loadPresets);
