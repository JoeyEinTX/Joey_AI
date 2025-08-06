
async function sendPrompt() {
    const prompt = document.getElementById('prompt').value;
    const res = await fetch('/query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt})
    });
    const data = await res.json();
    document.getElementById('response').innerText = data.response;
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
