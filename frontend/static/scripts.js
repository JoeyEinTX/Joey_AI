// Chat send/stream event wiring - repaired implementation
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - binding event listeners');
  
  // Required elements per task specification
  const ta = document.getElementById('composer-input');   // textarea
  const btn = document.getElementById('send-btn');         // send button
  const msgs = document.getElementById('messages');        // scroll container
  
  // Additional UI elements
  const composer = document.getElementById('composer');
  const providerSelect = document.getElementById('provider-select');
  const modelInput = document.getElementById('model-input');
  const temperatureSlider = document.getElementById('temperature-slider');
  const temperatureValue = document.getElementById('temperature-value');
  const toastContainer = document.getElementById('toast-container');
  const clearBtn = document.getElementById('clearBtn');
  const newProjectBtn = document.getElementById('new-project-btn');
  const projectList = document.getElementById('project-list');
  
  // Verify required elements exist
  if (!ta) console.error('Missing textarea element: #composer-input');
  if (!btn) console.error('Missing send button element: #send-btn');
  if (!msgs) console.error('Missing messages container element: #messages');
  
  // State management
  let currentConversationId = null;
  let isStreaming = false;
  
  // Initialize markdown-it
  const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
      if (lang && Prism.languages[lang]) {
        try {
          return Prism.highlight(str, Prism.languages[lang], lang);
        } catch (__) {}
      }
      return '';
    }
  });

  // Bind events after DOMContentLoaded
  if (btn) {
    btn.addEventListener('click', onSend);
    console.log('Send button click listener bound');
  }
  
  if (ta) {
    ta.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        onSend();
      }
    });
    console.log('Textarea Ctrl+Enter listener bound');
  }
  
  if (composer) {
    composer.addEventListener('submit', (e) => {
      e.preventDefault();
      onSend();
    });
  }

  // onSend implementation
  async function onSend() {
    console.log('onSend fired');
    
    if (!ta || !btn || !msgs) {
      console.error('Required elements missing for onSend');
      return;
    }
    
    // Read value; trim; return if empty
    const text = ta.value.trim();
    if (!text) {
      console.log('Empty input - nothing to send');
      return;
    }
    
    if (isStreaming) {
      console.log('Already streaming - ignoring send');
      return;
    }
    
    console.log('Sending message:', text.substring(0, 50) + '...');
    
    // Create new conversation if none exists
    if (!currentConversationId) {
      currentConversationId = await createNewConversation();
      if (!currentConversationId) {
        showToast('Failed to create conversation', 'error');
        return;
      }
    }
    
    // Append user bubble immediately
    appendUserMessage(text);
    
    // Disable btn, set aria-busy; clear textarea
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = 'Sending...';
    ta.value = '';
    isStreaming = true;
    
    // Get current model settings with defaults
    const provider = providerSelect?.value || 'ollama';
    const model = modelInput?.value || 'qwen2.5-coder:7b';
    const temperature = parseFloat(temperatureSlider?.value || 0.2);
    
    // Build messages array (simplified for now)
    const messages = [{ role: 'user', content: text }];
    
    try {
      // Call startStream
      await startStream({
        model,
        provider,
        temperature,
        messages
      });
      
      console.log('Stream completed successfully');
    } catch (error) {
      console.error('Stream failed:', error);
      showToast('Send failed: ' + error.message, 'error');
    } finally {
      // Re-enable btn
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = 'Send';
      isStreaming = false;
    }
  }

  // Robust SSE reader function
  async function readSSE(response, onChunk, onDone) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('SSE reader: stream ended');
          break;
        }
        
        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        console.log(`SSE chunk len=${value.length}`);
        
        // Split on double newlines to get complete SSE frames
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || ''; // Keep incomplete frame in buffer
        
        for (const frame of frames) {
          if (!frame.trim()) continue; // Skip empty frames
          
          const lines = frame.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              // Handle [DONE] sentinel
              if (data === '[DONE]') {
                console.log('SSE done');
                onDone();
                return;
              }
              
              // Parse JSON and extract content
              try {
                const obj = JSON.parse(data);
                const piece = obj.choices?.[0]?.delta?.content || '';
                if (piece) {
                  onChunk(piece);
                }
                
                // Check for finish_reason
                if (obj.choices?.[0]?.finish_reason === 'stop') {
                  console.log('SSE done via finish_reason');
                  onDone();
                  return;
                }
              } catch (e) {
                console.warn('SSE: malformed JSON:', data);
              }
            }
          }
        }
      }
      
      // If we exit the loop without [DONE], call onDone anyway
      onDone();
    } catch (error) {
      console.error('SSE reader error:', error);
      throw error;
    }
  }

  // startStream implementation with robust SSE handling and fallback
  async function startStream(payload) {
    console.log('Starting stream with payload:', payload);
    
    // Create abort controller for timeout
    const abortController = new AbortController();
    let timeoutId;
    let lastChunkTime = Date.now();
    
    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          stream: true
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortController.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch failed:', response.status, errorText);
        
        // Fetch debug info on failure
        try {
          const debugResponse = await fetch('/v1/debug/echo');
          const debugData = await debugResponse.json();
          console.log('DEBUG ECHO', debugData);
          
          const debugStr = JSON.stringify(debugData).substring(0, 200);
          showToast(`HTTP ${response.status}: ${response.statusText} | Debug: ${debugStr}`, 'error');
        } catch (debugError) {
          console.error('Failed to fetch debug info:', debugError);
          showToast(`HTTP ${response.status}: ${response.statusText}`, 'error');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('Stream response received, starting to read...');
      
      // Create assistant bubble for streaming
      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'msg assistant streaming';
      assistantBubble.textContent = '';
      msgs.appendChild(assistantBubble);
      autoScroll();
      
      let fullText = '';
      let streamCompleted = false;
      
      // Set up 8-second inactivity timer
      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!streamCompleted) {
            console.log('Stream timeout - falling back to non-stream');
            abortController.abort();
          }
        }, 8000);
      };
      
      resetTimeout(); // Start initial timeout
      
      // Handle streaming chunks
      const onChunk = (piece) => {
        lastChunkTime = Date.now();
        resetTimeout(); // Reset timeout on each chunk
        fullText += piece;
        assistantBubble.textContent = fullText;
        autoScroll();
      };
      
      const onDone = () => {
        streamCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        // Re-render with markdown and syntax highlighting
        assistantBubble.classList.remove('streaming');
        assistantBubble.innerHTML = renderAssistantMessage(fullText);
        autoScroll();
      };
      
      // Start reading SSE stream
      await readSSE(response, onChunk, onDone);
      
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Check if this was a timeout/abort - if so, try fallback
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        console.log('Stream aborted, attempting non-stream fallback');
        
        try {
          // Remove streaming bubble
          if (msgs.lastElementChild?.classList.contains('streaming')) {
            msgs.removeChild(msgs.lastElementChild);
          }
          
          // Make non-stream request
          const fallbackResponse = await fetch('/v1/chat/completions', {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              stream: false
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!fallbackResponse.ok) {
            // Fetch debug info on fallback failure too
            try {
              const debugResponse = await fetch('/v1/debug/echo');
              const debugData = await debugResponse.json();
              console.log('DEBUG ECHO', debugData);
              
              const debugStr = JSON.stringify(debugData).substring(0, 200);
              throw new Error(`Fallback failed: ${fallbackResponse.status} | Debug: ${debugStr}`);
            } catch (debugError) {
              console.error('Failed to fetch debug info:', debugError);
              throw new Error(`Fallback failed: ${fallbackResponse.status}`);
            }
          }
          
          const result = await fallbackResponse.json();
          const content = result.choices?.[0]?.message?.content || 'No response received';
          
          // Create assistant bubble with full content
          const assistantBubble = document.createElement('div');
          assistantBubble.className = 'msg assistant';
          assistantBubble.innerHTML = renderAssistantMessage(content);
          msgs.appendChild(assistantBubble);
          autoScroll();
          
          // Show fallback toast
          showToast('Stream fell back to non-stream', 'warning');
          
        } catch (fallbackError) {
          console.error('Fallback request failed:', fallbackError);
          showToast('Both stream and fallback failed: ' + fallbackError.message, 'error');
          throw fallbackError;
        }
      } else {
        console.error('startStream error:', error);
        throw error;
      }
    }
  }
  
  // Helper function to render assistant messages with markdown and syntax highlighting
  function renderAssistantMessage(content) {
    const rendered = md.render(content);
    // Create a temporary element to add copy buttons
    const temp = document.createElement('div');
    temp.innerHTML = rendered;
    addCopyButtonsToCodeBlocks(temp);
    Prism.highlightAllUnder(temp);
    return temp.innerHTML;
  }
  
  // Helper functions
  function appendUserMessage(content) {
    const bubble = document.createElement('div');
    bubble.className = 'msg user';
    bubble.textContent = content;
    msgs.appendChild(bubble);
    autoScroll();
  }
  
  function autoScroll() {
    if (msgs) {
      msgs.scrollTop = msgs.scrollHeight;
    }
  }
  
  function addCopyButtonsToCodeBlocks(element) {
    const codeBlocks = element.querySelectorAll('pre code');
    codeBlocks.forEach(codeBlock => {
      const pre = codeBlock.parentElement;
      if (pre.querySelector('.copy-btn')) return; // Already has copy button
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(codeBlock.textContent || '');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      };
      
      pre.style.position = 'relative';
      pre.appendChild(copyBtn);
    });
  }
  
  // Toast notifications
  function showToast(message, type = 'error') {
    console.log('Toast:', type, message);
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }
  
  // Conversation management (simplified)
  async function createNewConversation() {
    try {
      const response = await fetch('/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: null })
      });
      const conversation = await response.json();
      console.log('Created new conversation:', conversation.id);
      return conversation.id;
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      return null;
    }
  }
  
  // Temperature slider update
  if (temperatureSlider && temperatureValue) {
    temperatureSlider.addEventListener('input', (e) => {
      temperatureValue.textContent = e.target.value;
    });
  }
  
  // Clear chat functionality
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (msgs) {
        msgs.innerHTML = '';
      }
      currentConversationId = null;
      console.log('Chat cleared');
    });
  }
  
  // Load model settings from localStorage
  function loadModelSettings() {
    try {
      const saved = localStorage.getItem('joeyai-model-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (providerSelect) providerSelect.value = settings.provider || 'ollama';
        if (modelInput) modelInput.value = settings.model || 'qwen2.5-coder:7b';
        if (temperatureSlider) {
          temperatureSlider.value = settings.temperature || 0.7;
          if (temperatureValue) temperatureValue.textContent = settings.temperature || 0.7;
        }
      }
    } catch (error) {
      console.error('Failed to load model settings:', error);
    }
  }
  
  function saveModelSettings() {
    const settings = {
      provider: providerSelect?.value || 'ollama',
      model: modelInput?.value || 'qwen2.5-coder:7b',
      temperature: parseFloat(temperatureSlider?.value || 0.7)
    };
    localStorage.setItem('joeyai-model-settings', JSON.stringify(settings));
  }
  
  // Save settings on change
  if (providerSelect) providerSelect.addEventListener('change', saveModelSettings);
  if (modelInput) modelInput.addEventListener('input', saveModelSettings);
  if (temperatureSlider) temperatureSlider.addEventListener('input', saveModelSettings);
  
  // Initialize
  loadModelSettings();
  
  console.log('Chat send/stream event wiring initialized');
});
