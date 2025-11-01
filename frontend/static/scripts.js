// Chat send/stream event wiring - enhanced implementation with DOM guards and proper rendering
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - binding event listeners');
  
  // Required elements per task specification with strong DOM guards
  const msgs = document.getElementById('messages');
  if (!msgs) { 
    console.error('#messages missing'); 
    alert('Fatal: #messages missing'); 
    return; 
  }
  
  const ta = document.getElementById('composer-input');   // textarea
  const btn = document.getElementById('send-btn');         // send button
  
  // Additional UI elements
  const composer = document.getElementById('composer');
  const providerSelect = document.getElementById('provider-select');
  const modelSelect = document.getElementById('model-select');
  const refreshModelsBtn = document.getElementById('refresh-models-btn');
  const temperatureSlider = document.getElementById('temperature-slider');
  const temperatureValue = document.getElementById('temperature-value');
  const toastContainer = document.getElementById('toast-container');
  const clearBtn = document.getElementById('clearBtn');
  const newConversationBtn = document.getElementById('new-conversation-btn');
  const conversationList = document.getElementById('conversation-list');
  const conversationSearch = document.getElementById('conversation-search');
  const healthDot = document.getElementById('health-dot');
  const testRenderBtn = document.getElementById('test-render-btn');
  const manualModelContainer = document.getElementById('manual-model-container');
  const manualModelInput = document.getElementById('model-manual');
  const testModelBtn = document.getElementById('test-model-btn');
  
  // Verify required elements exist
  if (!ta) console.error('Missing textarea element: #composer-input');
  if (!btn) console.error('Missing send button element: #send-btn');
  
  // State management
  let currentConversationId = null;
  let isStreaming = false;
  let healthStatus = { ok: false, base: null, state: 'offline' }; // online | degraded | offline
  let lastSendFailed = false;
  
  // Expose currentConversationId to global scope for keyboard shortcuts
  Object.defineProperty(window, 'currentConversationId', {
    get: () => currentConversationId,
    set: (value) => { currentConversationId = value; }
  });
  
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

  // ensureAssistantBubble function per task requirements
  function ensureAssistantBubble(initial = "") {
    let b = document.querySelector("#messages .message.assistant.pending");
    if (!b) {
      b = document.createElement("div");
      b.className = "message assistant pending";
      b.innerHTML = "<div class='content'></div>";
      msgs.appendChild(b);
      msgs.scrollTop = msgs.scrollHeight;
    }
    const c = b.querySelector(".content");
    if (initial) c.textContent = initial;
    return { bubble: b, contentEl: c };
  }

  // Health checking functionality with enhanced state tracking
  async function checkHealth() {
    try {
      const response = await fetch('/v1/health');
      const health = await response.json();
      
      // Extract the actual health status from the API response
      const isHealthy = health.ollama && health.ollama.ok;
      const baseUrl = health.ollama ? health.ollama.base : 'unknown';
      
      // Determine state: online | degraded | offline
      let newState;
      if (isHealthy) {
        newState = lastSendFailed ? 'degraded' : 'online';
      } else {
        newState = 'offline';
      }
      
      healthStatus = { ok: isHealthy, base: baseUrl, state: newState };
      
      // Update health dot and base display
      if (healthDot) {
        healthDot.className = `health-dot ${newState}`;
        
        if (newState === 'online') {
          healthDot.title = `Online - Base: ${baseUrl}`;
          healthDot.textContent = `Online - ${baseUrl}`;
        } else if (newState === 'degraded') {
          healthDot.title = `Degraded - Base: ${baseUrl}`;
          healthDot.textContent = `Degraded - ${baseUrl}`;
        } else {
          healthDot.title = `Backend offline @ ${baseUrl}`;
          healthDot.textContent = `Offline - ${baseUrl}`;
        }
      }
      
      // Enable/disable send button and textarea based on health
      const isOffline = newState === 'offline';
      if (btn) {
        btn.disabled = isOffline;
        if (isOffline) {
          btn.title = `Backend offline @ ${baseUrl}`;
        } else {
          btn.title = '';
        }
      }
      if (ta) {
        ta.disabled = isOffline;
        if (isOffline) {
          ta.placeholder = `Backend offline @ ${baseUrl}`;
        } else {
          ta.placeholder = 'Enter your prompt here…';
        }
      }
      
    } catch (error) {
      console.error('Health check failed:', error);
      healthStatus = { ok: false, base: 'unknown', state: 'offline' };
      
      if (healthDot) {
        healthDot.className = 'health-dot offline';
        healthDot.title = 'Health check failed';
        healthDot.textContent = 'Offline - unknown';
      }
      
      if (btn) {
        btn.disabled = true;
        btn.title = 'Backend offline @ unknown';
      }
      if (ta) {
        ta.disabled = true;
        ta.placeholder = 'Backend offline @ unknown';
      }
    }
  }

  // Start health checking every 10 seconds per requirements
  checkHealth(); // Initial check
  setInterval(checkHealth, 10000);

  // Test Render button functionality
  if (testRenderBtn) {
    testRenderBtn.addEventListener('click', async () => {
      console.log('Test Render button clicked');
      try {
        const response = await fetch('/v1/dev/hello');
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || "";
        
        const { bubble } = ensureAssistantBubble();
        bubble.classList.remove("pending");
        bubble.innerHTML = renderAssistantMessage(text);
        
        console.log('Test render completed');
      } catch (error) {
        console.error('Test render failed:', error);
        showToast('Test render failed: ' + error.message, 'error');
      }
    });
  }

  // Bind events after DOMContentLoaded with deduplication guard
  let sendInProgress = false;
  
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!sendInProgress) {
        sendInProgress = true;
        onSend().finally(() => { sendInProgress = false; });
      }
    });
    console.log('Send button click listener bound');
  }
  
  if (ta) {
    ta.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!sendInProgress) {
          sendInProgress = true;
          onSend().finally(() => { sendInProgress = false; });
        }
      }
    });
    console.log('Textarea Ctrl+Enter listener bound');
  }
  
  if (composer) {
    composer.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!sendInProgress) {
        sendInProgress = true;
        onSend().finally(() => { sendInProgress = false; });
      }
    });
    console.log('Form submit listener bound');
  }

  // onSend implementation with enhanced logging and retry logic
  async function onSend() {
    console.log('onSend fired');
    
    if (!ta || !btn || !msgs) {
      console.error('Required elements missing for onSend');
      return;
    }
    
    // Check health status before sending
    if (healthStatus.state === 'offline') {
      showToast(`Backend offline @ ${healthStatus.base || 'unknown'}`, 'error');
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
    
    // Get current model settings - use manual input if dropdown is empty
    const provider = (providerSelect?.value || 'ollama').toLowerCase();
    let model = modelSelect?.value;
    
    // If no model selected or "(no models)", use manual input
    if (!model || model === '' || modelSelect?.textContent?.includes('(no models)')) {
      model = getManualModelForProvider(provider) || 'qwen2.5-coder:7b';
    }
    
    const temperature = parseFloat(temperatureSlider?.value || 0.2);
    
    // Build messages array (simplified for now)
    const messages = [{ role: 'user', content: text }];
    
    // Build payload
    const payload = {
      model,
      provider,
      temperature,
      messages
    };
    
    // Log exact payload at send start per requirements
    console.log('UI PAYLOAD', payload);
    
    try {
      // Try stream first, then fallback with retries
      await sendWithRetries(payload);
      
      // Mark send as successful
      lastSendFailed = false;
      console.log('Send completed successfully');
    } catch (error) {
      console.error('Send failed:', error);
      lastSendFailed = true;
      
      // Show toast with copy payload button
      showToastWithCopyPayload('Send failed: ' + error.message, payload);
    } finally {
      // Re-enable btn
      btn.disabled = healthStatus.state === 'offline';
      btn.removeAttribute('aria-busy');
      btn.textContent = 'Send';
      isStreaming = false;
      
      // Refresh sidebar to show updated conversation
      refreshSidebar();
    }
  }

  // Non-stream path implementation per requirements
  async function sendNonStream(payload) {
    console.log('Starting non-stream request');
    
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        stream: false
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Non-stream fetch failed:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content
              || data?.message?.content
              || data?.content
              || "";
    
    if (!text) console.warn("Non-stream: empty text", data);
    
    console.log('UI NONSTREAM TEXT len', text.length);
    
    ensureAssistantBubble(text);
    const { bubble } = ensureAssistantBubble();
    bubble.classList.remove("pending");
    bubble.innerHTML = renderAssistantMessage(text);
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

  // Enhanced send with retries implementation
  async function sendWithRetries(payload) {
    const provider = payload.provider;
    const model = payload.model;
    const base = healthStatus.base || 'unknown';
    
    // Try stream first
    console.log(`SEND try=1 stream=true provider=${provider} model=${model} base=${base}`);
    
    try {
      await startStreamWithTimeout(payload);
      console.log(`SEND ok len=${document.querySelector('#messages .message.assistant:last-child .content')?.textContent?.length || 0}`);
      return;
    } catch (error) {
      console.log(`SEND fail status=${error.status || 'unknown'}`);
      
      // If stream failed, try non-stream with exponential backoff
      const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const tryNum = attempt + 2; // Since stream was try 1
        
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
        }
        
        console.log(`SEND try=${tryNum} stream=false provider=${provider} model=${model} base=${base}`);
        
        try {
          await sendNonStreamWithLogging(payload);
          console.log(`SEND ok len=${document.querySelector('#messages .message.assistant:last-child .content')?.textContent?.length || 0}`);
          return;
        } catch (retryError) {
          console.log(`SEND fail status=${retryError.status || 'unknown'}`);
          
          if (attempt === 2) { // Last attempt
            throw retryError;
          }
        }
      }
    }
  }

  // startStream with 6-second timeout
  async function startStreamWithTimeout(payload) {
    console.log('Starting stream with payload:', payload);
    
    // Ensure assistant bubble immediately per requirements
    const { bubble, contentEl } = ensureAssistantBubble();
    
    // Create abort controller for timeout
    const abortController = new AbortController();
    let timeoutId;
    let fullText = '';
    let streamCompleted = false;
    let hasReceivedChunks = false;
    
    // Set up 6-second timeout per requirements
    timeoutId = setTimeout(() => {
      if (!streamCompleted && !hasReceivedChunks) {
        console.log('6s timeout - no chunks received');
        abortController.abort();
      }
    }, 6000);
    
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
        console.error('Stream fetch failed:', response.status, errorText);
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        throw error;
      }
      
      console.log('Stream response received, starting to read...');
      
      // Handle streaming chunks
      const onChunk = (piece) => {
        hasReceivedChunks = true;
        if (timeoutId) clearTimeout(timeoutId); // Clear timeout once we get chunks
        fullText += piece;
        contentEl.textContent = fullText;
        autoScroll();
      };
      
      const onDone = () => {
        streamCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        // Remove .pending and re-render with markdown per requirements
        bubble.classList.remove('pending');
        bubble.innerHTML = renderAssistantMessage(fullText);
        autoScroll();
      };
      
      // Start reading SSE stream
      await readSSE(response, onChunk, onDone);
      
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Check if this was a timeout/abort
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        const timeoutError = new Error('Stream timeout - no chunks in 6s');
        timeoutError.status = 'timeout';
        throw timeoutError;
      } else {
        bubble.classList.remove('pending');
        bubble.innerHTML = '<div class="content">Error: ' + error.message + '</div>';
        throw error;
      }
    }
  }

  // Non-stream with logging
  async function sendNonStreamWithLogging(payload) {
    console.log('Starting non-stream request');
    
    const { bubble, contentEl } = ensureAssistantBubble();
    
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        stream: false
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Non-stream fetch failed:', response.status, errorText);
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }
    
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content
              || data?.message?.content
              || data?.content
              || "";
    
    if (!text) console.warn("Non-stream: empty text", data);
    
    // Render the returned text
    bubble.classList.remove('pending');
    bubble.innerHTML = renderAssistantMessage(text);
    autoScroll();
  }
  
  // Helper function to render assistant messages with markdown and syntax highlighting
  function renderAssistantMessage(content) {
    const rendered = md.render(content);
    // Create a temporary element to add copy buttons
    const temp = document.createElement('div');
    temp.className = 'content';
    temp.innerHTML = rendered;
    addCopyButtonsToCodeBlocks(temp);
    Prism.highlightAllUnder(temp);
    return temp.outerHTML;
  }
  
  // Helper functions
  function appendUserMessage(content) {
    const bubble = document.createElement('div');
    bubble.className = 'msg user';
    bubble.textContent = content;
    msgs.appendChild(bubble);
    autoScroll();
    
    // Show messages container and hide hero
    document.body.classList.add('has-started');
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
  
  // Enhanced toast notifications with copy payload functionality
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
  
  // Toast with copy payload button for send failures
  function showToastWithCopyPayload(message, payload) {
    console.log('Toast with copy payload:', message);
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast error';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy payload';
    copyBtn.style.marginLeft = '8px';
    copyBtn.style.padding = '2px 6px';
    copyBtn.style.fontSize = '12px';
    copyBtn.style.background = 'rgba(255,255,255,0.2)';
    copyBtn.style.border = '1px solid rgba(255,255,255,0.3)';
    copyBtn.style.borderRadius = '3px';
    copyBtn.style.color = 'white';
    copyBtn.style.cursor = 'pointer';
    
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy payload', 2000);
    };
    
    toast.appendChild(messageSpan);
    toast.appendChild(copyBtn);
    toastContainer.appendChild(toast);
    
    // Auto-remove after 8 seconds (longer for copy action)
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 8000);
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
      document.body.classList.remove('has-started');
      console.log('Chat cleared');
    });
  }
  
  // Enhanced model loading with resilience
  async function fetchModels(provider = null) {
    try {
      const url = provider ? `/v1/models?provider=${provider}` : '/v1/models';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch models:', error);
      throw error;
    }
  }
  
  async function populateModelDropdown(provider = null) {
    if (!modelSelect) return;
    
    // Store current selection to preserve it
    const currentSelection = modelSelect.value;
    
    // Show loading state
    modelSelect.disabled = true;
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Loading...';
    modelSelect.innerHTML = '';
    modelSelect.appendChild(loadingOption);
    
    try {
      const currentProvider = provider || providerSelect?.value || 'ollama';
      const modelsData = await fetchModels(currentProvider);
      
      // Clear dropdown
      modelSelect.innerHTML = '';
      
      // Get models for current provider
      let models = [];
      if (currentProvider === 'ollama' && modelsData.ollama) {
        models = modelsData.ollama.map(m => ({ name: m.name, display: m.name }));
      } else if (currentProvider === 'anthropic' && modelsData.anthropic) {
        models = modelsData.anthropic.map(m => ({ name: m.name, display: m.name }));
      }
      
      if (models.length === 0) {
        // Show "(no models)" option when list is empty
        const noModelsOption = document.createElement('option');
        noModelsOption.value = '';
        noModelsOption.textContent = '(no models)';
        noModelsOption.style.fontStyle = 'italic';
        noModelsOption.style.opacity = '0.7';
        modelSelect.appendChild(noModelsOption);
        
        // Show manual model container
        if (manualModelContainer) {
          manualModelContainer.style.display = 'flex';
        }
        
        // Show toast with base URL and debug suggestion
        const base = healthStatus.base || 'unknown';
        showToast(`No models found @ ${base}`, 'error');
        
        // Console warning with debug URL
        const debugUrl = `${window.location.origin}/v1/models/debug`;
        console.warn(`Model fetch failed. Debug endpoint: ${debugUrl}`);
        console.warn('Click the "Debug" link in the model dropdown to investigate.');
        
      } else {
        // Hide manual model container when we have models
        if (manualModelContainer) {
          manualModelContainer.style.display = 'none';
        }
        
        // Add models to dropdown
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.name;
          option.textContent = model.display;
          modelSelect.appendChild(option);
        });
        
        // Try to restore previous selection first
        if (currentSelection && models.some(m => m.name === currentSelection)) {
          modelSelect.value = currentSelection;
        } else {
          // Try to restore saved model for this provider
          const savedModel = getSavedModelForProvider(currentProvider);
          if (savedModel && models.some(m => m.name === savedModel)) {
            modelSelect.value = savedModel;
          } else if (models.length > 0) {
            // Select first model if saved model not found
            modelSelect.value = models[0].name;
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to populate model dropdown:', error);
      
      // Show "(no models)" option on error and preserve selection
      modelSelect.innerHTML = '';
      const errorOption = document.createElement('option');
      errorOption.value = currentSelection || '';
      errorOption.textContent = currentSelection || '(no models)';
      errorOption.style.fontStyle = 'italic';
      errorOption.style.opacity = '0.7';
      modelSelect.appendChild(errorOption);
      
      // Show manual model container on error
      if (manualModelContainer) {
        manualModelContainer.style.display = 'flex';
      }
      
      // Show toast with base URL and debug suggestion
      const base = healthStatus.base || 'unknown';
      showToast(`No models found @ ${base}`, 'error');
      
      // Console warning with debug URL
      const debugUrl = `${window.location.origin}/v1/models/debug`;
      console.warn(`Model fetch failed. Debug endpoint: ${debugUrl}`);
      console.warn('Click the "Debug" link in the model dropdown to investigate.');
      
    } finally {
      modelSelect.disabled = false;
    }
  }
  
  // localStorage functions for per-provider model persistence
  function getSavedModelForProvider(provider) {
    try {
      const saved = localStorage.getItem(`joeyai-model-${provider}`);
      return saved;
    } catch (error) {
      console.error('Failed to get saved model:', error);
      return null;
    }
  }
  
  function saveModelForProvider(provider, model) {
    try {
      localStorage.setItem(`joeyai-model-${provider}`, model);
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  }
  
  // Manual model functions
  function getManualModelForProvider(provider) {
    try {
      const saved = localStorage.getItem(`joeyai-manual-model-${provider}`);
      return saved;
    } catch (error) {
      console.error('Failed to get manual model:', error);
      return null;
    }
  }
  
  function saveManualModelForProvider(provider, model) {
    try {
      localStorage.setItem(`joeyai-manual-model-${provider}`, model);
    } catch (error) {
      console.error('Failed to save manual model:', error);
    }
  }
  
  // Load model settings from localStorage
  function loadModelSettings() {
    try {
      const saved = localStorage.getItem('joeyai-model-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (providerSelect) providerSelect.value = settings.provider || 'ollama';
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
    const provider = providerSelect?.value || 'ollama';
    const model = modelSelect?.value;
    const temperature = parseFloat(temperatureSlider?.value || 0.7);
    
    // Save general settings
    const settings = {
      provider,
      temperature
    };
    localStorage.setItem('joeyai-model-settings', JSON.stringify(settings));
    
    // Save model per provider
    if (model) {
      saveModelForProvider(provider, model);
    }
  }
  
  // Provider change handler
  if (providerSelect) {
    providerSelect.addEventListener('change', async () => {
      saveModelSettings();
      await populateModelDropdown();
    });
  }
  
  // Model change handler
  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      saveModelSettings();
    });
  }
  
  // Temperature change handler
  if (temperatureSlider) {
    temperatureSlider.addEventListener('input', saveModelSettings);
  }
  
  // Refresh models button handler
  if (refreshModelsBtn) {
    refreshModelsBtn.addEventListener('click', async () => {
      console.log('Refresh models button clicked');
      
      // Show loading state
      refreshModelsBtn.disabled = true;
      refreshModelsBtn.classList.add('loading');
      
      try {
        await populateModelDropdown();
        showToast('Models refreshed', 'success');
      } catch (error) {
        console.error('Failed to refresh models:', error);
        showToast('Failed to refresh models', 'error');
      } finally {
        refreshModelsBtn.disabled = false;
        refreshModelsBtn.classList.remove('loading');
      }
    });
  }
  
  // Sidebar conversation management functions
  async function refreshSidebar() {
    if (!conversationList) return;
    
    try {
      const response = await fetch('/conversations');
      const conversations = await response.json();
      
      conversationList.innerHTML = '';
      
      if (conversations.length === 0) {
        conversationList.innerHTML = '<div class="muted">No conversations yet</div>';
        return;
      }
      
      conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.conversationId = conv.id;
        
        if (conv.id === currentConversationId) {
          item.classList.add('active');
        }
        
        const title = conv.title || 'New Conversation';
        const updatedAt = new Date(conv.updated_at).toLocaleDateString();
        
        item.innerHTML = `
          <div class="conversation-title">${title}</div>
          <div class="conversation-updated">${updatedAt}</div>
        `;
        
        item.addEventListener('click', () => loadConversation(conv.id));
        conversationList.appendChild(item);
      });
      
    } catch (error) {
      console.error('Failed to refresh sidebar:', error);
      conversationList.innerHTML = '<div class="muted">Failed to load conversations</div>';
    }
  }
  
  async function loadConversation(conversationId) {
    try {
      // Update active state in sidebar
      const items = conversationList.querySelectorAll('.conversation-item');
      items.forEach(item => {
        item.classList.toggle('active', item.dataset.conversationId == conversationId);
      });
      
      // Load messages for this conversation
      const response = await fetch(`/conversations/${conversationId}/messages`);
      const messages = await response.json();
      
      // Clear current messages
      msgs.innerHTML = '';
      
      // Load messages into chat
      messages.forEach(msg => {
        if (msg.role === 'user') {
          const bubble = document.createElement('div');
          bubble.className = 'msg user';
          bubble.textContent = msg.content;
          msgs.appendChild(bubble);
        } else if (msg.role === 'assistant') {
          const bubble = document.createElement('div');
          bubble.className = 'msg assistant';
          bubble.innerHTML = renderAssistantMessage(msg.content);
          msgs.appendChild(bubble);
        }
      });
      
      // Update current conversation ID
      currentConversationId = conversationId;
      
      // Show messages if we have any
      if (messages.length > 0) {
        document.body.classList.add('has-started');
      }
      
      // Scroll to bottom
      autoScroll();
      
    } catch (error) {
      console.error('Failed to load conversation:', error);
      showToast('Failed to load conversation', 'error');
    }
  }
  
  // New conversation button handler
  if (newConversationBtn) {
    newConversationBtn.addEventListener('click', async () => {
      try {
        const newId = await createNewConversation();
        if (newId) {
          // Clear current chat
          msgs.innerHTML = '';
          currentConversationId = newId;
          document.body.classList.remove('has-started');
          
          // Refresh sidebar to show new conversation
          await refreshSidebar();
          
          console.log('New conversation created:', newId);
        }
      } catch (error) {
        console.error('Failed to create new conversation:', error);
        showToast('Failed to create new conversation', 'error');
      }
    });
  }
  
  // Search functionality (basic filter)
  if (conversationSearch) {
    conversationSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const items = conversationList.querySelectorAll('.conversation-item');
      
      items.forEach(item => {
        const title = item.querySelector('.conversation-title').textContent.toLowerCase();
        const matches = title.includes(searchTerm);
        item.style.display = matches ? 'flex' : 'none';
      });
    });
  }
  
  // Expose functions to global scope for keyboard shortcuts and external use
  window.showToast = showToast;
  window.refreshSidebar = refreshSidebar;
  
  // Gear menu handler
  const gearBtn = document.getElementById('gear-btn');
  const gearMenu = document.getElementById('gear-menu');
  
  if (gearBtn && gearMenu) {
    gearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      gearMenu.classList.toggle('hidden');
    });
    
    // Close gear menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!gearMenu.classList.contains('hidden') && !gearMenu.contains(e.target) && e.target !== gearBtn) {
        gearMenu.classList.add('hidden');
      }
    });
    
    // Handle gear menu actions
    gearMenu.querySelectorAll('.gear-item[data-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        gearMenu.classList.add('hidden');
        
        if (action === 'memory') {
          // Open memory modal (existing functionality)
          const memoryModal = document.getElementById('memoryModal');
          if (memoryModal) {
            memoryModal.classList.remove('hidden');
          }
        } else if (action === 'settings') {
          // Show keyboard shortcuts modal
          if (window.showShortcutsModal) {
            window.showShortcutsModal();
          }
        } else if (action === 'about') {
          // Show about dialog
          showAboutDialog();
        }
      });
    });
  }
  
  /**
   * Show about dialog
   */
  function showAboutDialog() {
    const existingModal = document.getElementById('about-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'about-modal';
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'false');
    
    const modalContent = `
      <div class="modal-dialog" style="max-width: 500px;">
        <div class="modal-header">
          <h3>ℹ️ About Joey_AI</h3>
          <button id="about-modal-close" class="icon-btn" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div style="padding: 16px; text-align: center;">
            <img src="${document.querySelector('.brand-logo')?.src || ''}" 
                 alt="Joey_AI" 
                 style="max-width: 200px; margin-bottom: 16px; filter: drop-shadow(0 0 8px rgba(77,224,255,0.4));">
            <h4 style="margin: 0 0 8px 0; color: var(--glow, #4de0ff);">Joey_AI Dashboard</h4>
            <p style="color: var(--muted, #8aa6c1); font-size: 14px; margin: 8px 0;">
              A powerful web interface for local LLM interaction
            </p>
            <div style="margin: 20px 0; padding: 16px; background: var(--surface-2, #0b0f16); border-radius: 8px; text-align: left;">
              <div style="font-size: 13px; color: var(--text, #e6e9ef); line-height: 1.6;">
                <strong>Features:</strong><br>
                • Multi-provider support (Ollama, Anthropic)<br>
                • Conversation management & export<br>
                • Memory system for notes & todos<br>
                • OpenAI-compatible API<br>
                • Keyboard shortcuts (Ctrl+/ for help)<br>
                • Streaming & non-streaming modes
              </div>
            </div>
            <div style="font-size: 12px; color: var(--muted, #8aa6c1); margin-top: 16px;">
              Press <kbd style="background: var(--surface-1, #141821); padding: 2px 6px; border-radius: 3px; font-family: monospace;">Ctrl+/</kbd> to view keyboard shortcuts
            </div>
          </div>
        </div>
      </div>
    `;
    
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
    
    const closeBtn = document.getElementById('about-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), 300);
      });
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), 300);
      }
    });
  }
  
  // Initialize sidebar on load and after sending messages
  refreshSidebar();
  
  // Initialize
  loadModelSettings();
  
  // Manual model input handler
  if (manualModelInput) {
    manualModelInput.addEventListener('input', (e) => {
      const provider = providerSelect?.value || 'ollama';
      const model = e.target.value.trim();
      if (model) {
        saveManualModelForProvider(provider, model);
      }
    });
    
    // Load saved manual model on provider change
    if (providerSelect) {
      const originalProviderHandler = providerSelect.onchange;
      providerSelect.addEventListener('change', () => {
        const provider = providerSelect.value || 'ollama';
        const savedManualModel = getManualModelForProvider(provider);
        if (savedManualModel && manualModelInput) {
          manualModelInput.value = savedManualModel;
        } else if (manualModelInput) {
          manualModelInput.value = '';
        }
      });
    }
  }
  
  // Test model button handler
  if (testModelBtn) {
    testModelBtn.addEventListener('click', async () => {
      console.log('Test model button clicked');
      
      const provider = (providerSelect?.value || 'ollama').toLowerCase();
      const manualModel = manualModelInput?.value?.trim();
      
      if (!manualModel) {
        showToast('Please enter a model name to test', 'error');
        return;
      }
      
      // Save the manual model
      saveManualModelForProvider(provider, manualModel);
      
      // Disable button during test
      testModelBtn.disabled = true;
      testModelBtn.textContent = 'Testing...';
      
      try {
        const payload = {
          model: manualModel,
          provider: provider,
          stream: false,
          messages: [{ role: 'user', content: 'ping' }]
        };
        
        console.log('Testing model with payload:', payload);
        
        const response = await fetch('/v1/chat/completions', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          showToast('Model OK', 'success');
          console.log('Model test successful');
        } else {
          const errorText = await response.text();
          const truncatedError = errorText.length > 120 ? errorText.substring(0, 120) + '...' : errorText;
          showToast(`HTTP ${response.status}: ${truncatedError}`, 'error');
          console.error('Model test failed:', response.status, errorText);
        }
        
      } catch (error) {
        console.error('Model test error:', error);
        showToast(`Test failed: ${error.message}`, 'error');
      } finally {
        testModelBtn.disabled = false;
        testModelBtn.textContent = 'Test';
      }
    });
  }
  
  // Initialize model dropdown
  populateModelDropdown();
  
  // Load initial manual model if needed
  if (manualModelInput && providerSelect) {
    const initialProvider = providerSelect.value || 'ollama';
    const savedManualModel = getManualModelForProvider(initialProvider);
    if (savedManualModel) {
      manualModelInput.value = savedManualModel;
    }
  }
  
  // System status bar polling with enhanced metrics
  let statusBarUpdateInterval = null;
  
  // Helper function to get color class based on percentage
  function getLoadClass(value, type = 'general') {
    if (type === 'temp') {
      // Temperature thresholds (in Celsius)
      if (value < 50) return 'low';
      if (value < 70) return 'medium';
      return 'high';
    } else {
      // General percentage thresholds
      if (value < 50) return 'low';
      if (value < 80) return 'medium';
      return 'high';
    }
  }
  
  async function updateSystemStatus() {
    try {
      const response = await fetch('/api/system_stats');
      const stats = await response.json();
      
      // Update CPU with color coding
      const cpuEl = document.getElementById('status-cpu');
      if (cpuEl) {
        cpuEl.textContent = `${stats.cpu}%`;
        cpuEl.className = `status-value ${getLoadClass(stats.cpu)}`;
        cpuEl.parentElement.title = `CPU Usage: ${stats.cpu}%`;
      }
      
      // Update Memory with color coding
      const memEl = document.getElementById('status-memory');
      if (memEl) {
        memEl.textContent = `${stats.memory}%`;
        memEl.className = `status-value ${getLoadClass(stats.memory)}`;
        memEl.parentElement.title = `Memory Usage: ${stats.memory}%`;
      }
      
      // Update GPU (show/hide based on availability)
      const gpuContainer = document.getElementById('status-gpu-container');
      const gpuEl = document.getElementById('status-gpu');
      if (stats.gpu !== null && stats.gpu !== undefined) {
        if (gpuContainer) gpuContainer.style.display = 'flex';
        if (gpuEl) {
          gpuEl.textContent = `${stats.gpu}%`;
          gpuEl.className = `status-value ${getLoadClass(stats.gpu)}`;
          gpuEl.parentElement.title = `GPU Usage: ${stats.gpu}%`;
        }
      } else {
        if (gpuContainer) gpuContainer.style.display = 'none';
      }
      
      // Update CPU Temperature
      const cpuTempContainer = document.getElementById('status-cpu-temp-container');
      const cpuTempEl = document.getElementById('status-cpu-temp');
      if (stats.cpu_temp !== null && stats.cpu_temp !== undefined) {
        if (cpuTempContainer) cpuTempContainer.style.display = 'flex';
        if (cpuTempEl) {
          cpuTempEl.textContent = `${stats.cpu_temp}°C`;
          cpuTempEl.className = `status-value ${getLoadClass(stats.cpu_temp, 'temp')}`;
          cpuTempEl.parentElement.title = `CPU Temperature: ${stats.cpu_temp}°C`;
        }
      } else {
        if (cpuTempContainer) cpuTempContainer.style.display = 'none';
      }
      
      // Update GPU Temperature
      const gpuTempContainer = document.getElementById('status-gpu-temp-container');
      const gpuTempEl = document.getElementById('status-gpu-temp');
      if (stats.gpu_temp !== null && stats.gpu_temp !== undefined) {
        if (gpuTempContainer) gpuTempContainer.style.display = 'flex';
        if (gpuTempEl) {
          gpuTempEl.textContent = `${stats.gpu_temp}°C`;
          gpuTempEl.className = `status-value ${getLoadClass(stats.gpu_temp, 'temp')}`;
          gpuTempEl.parentElement.title = `GPU Temperature: ${stats.gpu_temp}°C`;
        }
      } else {
        if (gpuTempContainer) gpuTempContainer.style.display = 'none';
      }
      
      // Update Power Draw
      const powerContainer = document.getElementById('status-power-container');
      const powerEl = document.getElementById('status-power');
      if (stats.power_draw !== null && stats.power_draw !== undefined) {
        if (powerContainer) powerContainer.style.display = 'flex';
        if (powerEl) {
          powerEl.textContent = `${stats.power_draw}W`;
          powerEl.className = 'status-value';
          powerEl.parentElement.title = `Power Draw: ${stats.power_draw}W`;
        }
      } else {
        if (powerContainer) powerContainer.style.display = 'none';
      }
      
      // Update Tokens per Second
      const tokensContainer = document.getElementById('status-tokens-container');
      const tokensEl = document.getElementById('status-tokens');
      if (stats.tokens_per_sec !== null && stats.tokens_per_sec !== undefined) {
        if (tokensContainer) tokensContainer.style.display = 'flex';
        if (tokensEl) {
          tokensEl.textContent = `${stats.tokens_per_sec} t/s`;
          tokensEl.className = 'status-value';
          tokensEl.parentElement.title = `Tokens per Second: ${stats.tokens_per_sec}`;
        }
      } else {
        if (tokensContainer) tokensContainer.style.display = 'none';
      }
      
      // Update Context Used
      const contextContainer = document.getElementById('status-context-container');
      const contextEl = document.getElementById('status-context');
      if (stats.context_used && stats.context_used !== '0/4096') {
        if (contextContainer) contextContainer.style.display = 'flex';
        if (contextEl) {
          contextEl.textContent = stats.context_used;
          contextEl.className = 'status-value';
          contextEl.parentElement.title = `Context: ${stats.context_used}`;
        }
      } else {
        if (contextContainer) contextContainer.style.display = 'none';
      }
      
      // Update Model
      const modelEl = document.getElementById('status-model');
      if (modelEl) {
        const shortModel = stats.model.length > 25 ? stats.model.substring(0, 22) + '...' : stats.model;
        modelEl.textContent = shortModel;
        modelEl.className = 'status-value';
        modelEl.parentElement.title = `Model: ${stats.model}`;
      }
      
      // Update Latency
      const latencyEl = document.getElementById('status-latency');
      if (latencyEl) {
        if (stats.latency > 0) {
          latencyEl.textContent = `${stats.latency}s`;
          latencyEl.className = 'status-value';
        } else {
          latencyEl.textContent = '--s';
          latencyEl.className = 'status-value';
        }
        latencyEl.parentElement.title = `Response Latency: ${stats.latency}s`;
      }
      
      // Update Connection Status
      const connEl = document.getElementById('status-connection');
      if (connEl) {
        connEl.className = `status-indicator ${stats.status}`;
        connEl.title = `Connection Status: ${stats.status}`;
      }
      
    } catch (error) {
      console.error('Failed to update system status:', error);
      
      // Show offline state on error
      const connEl = document.getElementById('status-connection');
      if (connEl) {
        connEl.className = 'status-indicator offline';
        connEl.title = 'Failed to fetch status';
      }
    }
  }
  
  // Start polling system stats every second
  updateSystemStatus(); // Initial update
  statusBarUpdateInterval = setInterval(updateSystemStatus, 1000);
  
  console.log('Chat send/stream event wiring initialized with enhanced DOM guards and rendering');
});
