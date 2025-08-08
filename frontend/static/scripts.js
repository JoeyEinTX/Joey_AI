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
