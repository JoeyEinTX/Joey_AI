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
  let sessionRecoveryAttempted = false;
  
  // Expose currentConversationId to global scope for keyboard shortcuts
  Object.defineProperty(window, 'currentConversationId', {
    get: () => currentConversationId,
    set: (value) => { 
      currentConversationId = value;
      // Save to localStorage for instant recovery
      if (value !== null) {
        localStorage.setItem('joeyai-last-conversation', value);
        // Also save to backend settings
        saveLastActiveConversation(value);
      }
    }
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
    
    // Track if this is the first message in a new conversation
    const isNewConversation = !currentConversationId;
    
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
      
      // Generate title for new conversations after first message
      if (isNewConversation && currentConversationId) {
        generateConversationTitle(currentConversationId, text);
      }
      
      // Refresh sidebar to show updated conversation
      refreshSidebar();
      
      // Update recent chats preview
      loadRecentChatsPreview();
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
  
  // Generate conversation title using AI
  async function generateConversationTitle(conversationId, userMessage) {
    try {
      console.log('Generating title for conversation:', conversationId);
      
      // Show "(Generating title...)" in sidebar temporarily
      updateConversationTitleInSidebar(conversationId, '(Generating title...)');
      
      // Create timeout promise (5 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Title generation timeout')), 5000);
      });
      
      // Create fetch promise
      const fetchPromise = fetch('/api/generate_title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          messages: [{ role: 'user', content: userMessage }]
        })
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const title = data.title || 'Untitled Chat';
      
      console.log('Generated title:', title);
      
      // Update sidebar with generated title
      updateConversationTitleInSidebar(conversationId, title);
      
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Fallback to "Untitled Chat" on error
      updateConversationTitleInSidebar(conversationId, 'Untitled Chat');
    }
  }
  
  // Update conversation title in sidebar without full refresh
  function updateConversationTitleInSidebar(conversationId, title) {
    if (!conversationList) return;
    
    const item = conversationList.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (item) {
      const titleEl = item.querySelector('.conversation-title');
      if (titleEl) {
        titleEl.textContent = title;
        // Add ellipsis truncation and tooltip
        titleEl.title = title;
        titleEl.style.overflow = 'hidden';
        titleEl.style.textOverflow = 'ellipsis';
        titleEl.style.whiteSpace = 'nowrap';
      }
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
      const response = await fetch('/conversations?include_archived=true');
      const conversations = await response.json();
      
      conversationList.innerHTML = '';
      
      if (conversations.length === 0) {
        conversationList.innerHTML = '<div class="muted">No conversations yet</div>';
        return;
      }
      
      // Separate active and archived conversations
      const activeConvs = conversations.filter(c => !c.archived);
      const archivedConvs = conversations.filter(c => c.archived);
      
      // Render active conversations
      activeConvs.forEach(conv => {
        conversationList.appendChild(createConversationItem(conv, false));
      });
      
      // Render archived section if there are archived conversations
      if (archivedConvs.length > 0) {
        const archivedHeader = document.createElement('div');
        archivedHeader.className = 'archived-header';
        archivedHeader.innerHTML = '<span class="archived-icon">🗃</span> Archived Chats';
        archivedHeader.style.marginTop = '16px';
        archivedHeader.style.padding = '8px 12px';
        archivedHeader.style.color = 'var(--muted, #8aa6c1)';
        archivedHeader.style.fontSize = '13px';
        archivedHeader.style.fontWeight = '600';
        archivedHeader.style.cursor = 'pointer';
        archivedHeader.style.userSelect = 'none';
        
        // Toggle archived visibility
        let archivedVisible = true;
        archivedHeader.addEventListener('click', () => {
          archivedVisible = !archivedVisible;
          archivedConvs.forEach(conv => {
            const item = conversationList.querySelector(`[data-conversation-id="${conv.id}"]`);
            if (item) {
              item.style.display = archivedVisible ? 'flex' : 'none';
            }
          });
        });
        
        conversationList.appendChild(archivedHeader);
        
        archivedConvs.forEach(conv => {
          conversationList.appendChild(createConversationItem(conv, true));
        });
      }
      
    } catch (error) {
      console.error('Failed to refresh sidebar:', error);
      conversationList.innerHTML = '<div class="muted">Failed to load conversations</div>';
    }
  }
  
  // Create a conversation item with context menu
  function createConversationItem(conv, isArchived) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.dataset.conversationId = conv.id;
    
    if (conv.id === currentConversationId) {
      item.classList.add('active');
    }
    
    if (isArchived) {
      item.style.opacity = '0.7';
    }
    
    const title = conv.title || 'New Conversation';
    const updatedAt = new Date(conv.updated_at).toLocaleDateString();
    
    item.innerHTML = `
      <div class="conversation-content" style="flex: 1; min-width: 0; cursor: pointer;">
        <div class="conversation-title" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${title}">${title}</div>
        <div class="conversation-updated" style="font-size: 11px; color: var(--muted, #8aa6c1);">${updatedAt}</div>
      </div>
      <button class="conversation-menu-btn" aria-label="More options" style="opacity: 0; transition: opacity 0.2s;">⋮</button>
    `;
    
    // Show menu button on hover
    item.addEventListener('mouseenter', () => {
      const menuBtn = item.querySelector('.conversation-menu-btn');
      if (menuBtn) menuBtn.style.opacity = '1';
    });
    
    item.addEventListener('mouseleave', () => {
      const menuBtn = item.querySelector('.conversation-menu-btn');
      if (menuBtn) menuBtn.style.opacity = '0';
    });
    
    // Click on content area loads conversation
    const contentArea = item.querySelector('.conversation-content');
    if (contentArea) {
      contentArea.addEventListener('click', (e) => {
        e.stopPropagation();
        loadConversation(conv.id);
      });
    }
    
    // Click on menu button opens context menu
    const menuBtn = item.querySelector('.conversation-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showContextMenu(e, conv, item);
      });
    }
    
    return item;
  }
  
  // Show context menu for conversation
  function showContextMenu(event, conv, itemElement) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.conversation-context-menu');
    if (existingMenu) existingMenu.remove();
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'conversation-context-menu';
    menu.style.cssText = `
      position: fixed;
      background: var(--surface-2, #0b0f16);
      border: 1px solid var(--border, #1e2936);
      border-radius: 6px;
      padding: 4px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 10000;
      min-width: 150px;
    `;
    
    // Menu items
    const menuItems = [
      { label: 'Rename', action: 'rename', icon: '✏️' },
      { label: conv.archived ? 'Unarchive' : 'Archive', action: conv.archived ? 'unarchive' : 'archive', icon: '🗃' },
      { label: 'Delete', action: 'delete', icon: '🗑️', danger: true }
    ];
    
    menuItems.forEach(({ label, action, icon, danger }) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        color: ${danger ? 'var(--danger, #ff6b6b)' : 'var(--text, #e6e9ef)'};
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.15s;
      `;
      menuItem.innerHTML = `<span>${icon}</span><span>${label}</span>`;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = 'var(--surface-3, #141d2a)';
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent';
      });
      
      menuItem.addEventListener('click', () => {
        menu.remove();
        handleContextMenuAction(action, conv, itemElement);
      });
      
      menu.appendChild(menuItem);
    });
    
    // Position menu
    const rect = event.target.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 0);
  }
  
  // Handle context menu actions
  async function handleContextMenuAction(action, conv, itemElement) {
    switch (action) {
      case 'rename':
        startInlineRename(conv, itemElement);
        break;
      case 'archive':
        await archiveConversation(conv.id);
        break;
      case 'unarchive':
        await unarchiveConversation(conv.id);
        break;
      case 'delete':
        showDeleteConfirmation(conv);
        break;
    }
  }
  
  // Start inline rename
  function startInlineRename(conv, itemElement) {
    const titleEl = itemElement.querySelector('.conversation-title');
    if (!titleEl) return;
    
    const currentTitle = conv.title || 'New Conversation';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'conversation-rename-input';
    input.style.cssText = `
      width: 100%;
      background: var(--surface-3, #141d2a);
      border: 1px solid var(--glow, #4de0ff);
      border-radius: 4px;
      padding: 4px 8px;
      color: var(--text, #e6e9ef);
      font-family: 'Courier New', monospace;
      font-size: 13px;
    `;
    input.title = 'Press Enter to save, Esc to cancel';
    
    // Replace title with input
    const parent = titleEl.parentElement;
    parent.replaceChild(input, titleEl);
    input.focus();
    input.select();
    
    // Save on Enter
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
          await renameConversation(conv.id, newTitle);
        } else {
          // Restore original title
          parent.replaceChild(titleEl, input);
        }
      } else if (e.key === 'Escape') {
        // Cancel rename
        parent.replaceChild(titleEl, input);
      }
    });
    
    // Save on blur
    input.addEventListener('blur', async () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== currentTitle) {
        await renameConversation(conv.id, newTitle);
      } else {
        // Restore original title if still in DOM
        if (input.parentElement) {
          parent.replaceChild(titleEl, input);
        }
      }
    });
  }
  
  // Rename conversation
  async function renameConversation(convId, newTitle) {
    try {
      const response = await fetch(`/api/conversations/${convId}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      
      if (response.ok) {
        await refreshSidebar();
        showToast('Conversation renamed', 'success');
      } else {
        showToast('Failed to rename conversation', 'error');
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      showToast('Failed to rename conversation', 'error');
    }
  }
  
  // Archive conversation
  async function archiveConversation(convId) {
    try {
      const response = await fetch(`/api/conversations/${convId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await refreshSidebar();
        showToast('Conversation archived', 'success');
      } else {
        showToast('Failed to archive conversation', 'error');
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
      showToast('Failed to archive conversation', 'error');
    }
  }
  
  // Unarchive conversation
  async function unarchiveConversation(convId) {
    try {
      const response = await fetch(`/api/conversations/${convId}/unarchive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await refreshSidebar();
        showToast('Conversation unarchived', 'success');
      } else {
        showToast('Failed to unarchive conversation', 'error');
      }
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      showToast('Failed to unarchive conversation', 'error');
    }
  }
  
  // Show delete confirmation modal
  function showDeleteConfirmation(conv) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'delete-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: var(--surface-2, #0b0f16);
      border: 1px solid var(--border, #1e2936);
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    `;
    
    modalContent.innerHTML = `
      <h3 style="margin: 0 0 12px 0; color: var(--text, #e6e9ef);">Delete Conversation?</h3>
      <p style="margin: 0 0 20px 0; color: var(--muted, #8aa6c1);">Are you sure you want to delete "${conv.title || 'this conversation'}"? This action cannot be undone.</p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="cancel-btn" style="padding: 8px 16px; background: var(--surface-3, #141d2a); border: 1px solid var(--border, #1e2936); border-radius: 4px; color: var(--text, #e6e9ef); cursor: pointer;">Cancel</button>
        <button class="delete-btn" style="padding: 8px 16px; background: var(--danger, #ff6b6b); border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: 600;">Delete</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Handle cancel
    const cancelBtn = modalContent.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Handle delete
    const deleteBtn = modalContent.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      modal.remove();
      await deleteConversationConfirmed(conv.id);
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  // Delete conversation (after confirmation)
  async function deleteConversationConfirmed(convId) {
    try {
      const response = await fetch(`/conversations/${convId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // If we deleted the current conversation, clear it
        if (convId === currentConversationId) {
          currentConversationId = null;
          msgs.innerHTML = '';
          document.body.classList.remove('has-started');
        }
        
        await refreshSidebar();
        showToast('Conversation deleted', 'success');
      } else {
        showToast('Failed to delete conversation', 'error');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast('Failed to delete conversation', 'error');
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
      
      // Update current conversation ID (this will trigger session save)
      currentConversationId = conversationId;
      
      // Show messages if we have any
      if (messages.length > 0) {
        document.body.classList.add('has-started');
      }
      
      // Scroll to bottom
      autoScroll();
      
      // Update recent chats preview
      loadRecentChatsPreview();
      
      console.log('[SESSION] Loaded conversation:', conversationId);
      
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
          
          // Update recent chats preview
          loadRecentChatsPreview();
          
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
  window.loadRecentChatsPreview = loadRecentChatsPreview;
  
  // Gear menu handler with robust dropdown toggle
  const gearBtn = document.getElementById('gear-btn');
  const gearMenu = document.getElementById('gear-menu');
  
  function closeGearMenu() {
    if (gearMenu && !gearMenu.hasAttribute('hidden')) {
      gearMenu.setAttribute('hidden', '');
      if (gearBtn) gearBtn.setAttribute('aria-expanded', 'false');
    }
  }
  
  if (gearBtn && gearMenu) {
    gearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = gearMenu.hasAttribute('hidden');
      if (isOpen) {
        gearMenu.removeAttribute('hidden');
        gearBtn.setAttribute('aria-expanded', 'true');
      } else {
        closeGearMenu();
      }
    });
    
    // Close gear menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!gearMenu.contains(e.target) && e.target !== gearBtn) {
        closeGearMenu();
      }
    });
    
    // Optional: ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeGearMenu();
    });
    
    // Handle gear menu actions
    gearMenu.querySelectorAll('.menu-item[data-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        closeGearMenu();
        
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
  
  // Session recovery and recent chats functions
  async function saveLastActiveConversation(conversationId) {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_active_conversation_id: conversationId })
      });
      console.log('[SESSION] Saved last active conversation:', conversationId);
    } catch (error) {
      console.error('[SESSION] Failed to save last active conversation:', error);
    }
  }
  
  async function recoverLastSession() {
    if (sessionRecoveryAttempted) return;
    sessionRecoveryAttempted = true;
    
    try {
      // First try localStorage for instant recovery
      const localStorageId = localStorage.getItem('joeyai-last-conversation');
      
      // Then get from backend settings
      const response = await fetch('/api/settings');
      const settings = await response.json();
      const backendId = settings.last_active_conversation_id;
      
      // Use backend ID if available, otherwise localStorage
      const conversationId = backendId || localStorageId;
      
      if (conversationId && conversationId !== 'null') {
        const convId = parseInt(conversationId);
        
        // Verify conversation exists
        const convResponse = await fetch(`/conversations/${convId}/messages`);
        if (convResponse.ok) {
          console.log('[SESSION] Recovering last session:', convId);
          await loadConversation(convId);
          showToast('Session recovered', 'success');
        } else {
          console.log('[SESSION] Last conversation no longer exists');
          localStorage.removeItem('joeyai-last-conversation');
        }
      }
    } catch (error) {
      console.error('[SESSION] Failed to recover session:', error);
    }
  }
  
  async function loadRecentChatsPreview() {
    const recentChatsContainer = document.getElementById('recent-chats-preview');
    if (!recentChatsContainer) return;
    
    try {
      const response = await fetch('/api/conversations/recent?limit=5');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const recentChats = await response.json();
      
      if (recentChats.length === 0) {
        recentChatsContainer.innerHTML = '<div class="recent-chat-empty">No recent conversations</div>';
        return;
      }
      
      recentChatsContainer.innerHTML = '';
      
      recentChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'recent-chat-item';
        if (chat.id === currentConversationId) {
          chatItem.classList.add('active');
        }
        
        const title = chat.title || 'New Conversation';
        const snippet = chat.last_message ? chat.last_message.snippet : 'No messages yet';
        const timestamp = chat.updated_at ? new Date(chat.updated_at).toLocaleDateString() : '';
        
        chatItem.innerHTML = `
          <div class="recent-chat-title" title="${title}">${title}</div>
          <div class="recent-chat-snippet">${snippet}</div>
          <div class="recent-chat-timestamp">${timestamp}</div>
        `;
        
        chatItem.addEventListener('click', () => {
          loadConversation(chat.id);
        });
        
        recentChatsContainer.appendChild(chatItem);
      });
      
      console.log('[SESSION] Loaded recent chats preview:', recentChats.length);
      
    } catch (error) {
      console.error('[SESSION] Failed to load recent chats preview:', error);
      if (recentChatsContainer) {
        recentChatsContainer.innerHTML = '<div class="recent-chat-empty">Failed to load recent chats</div>';
      }
    }
  }
  
  // Initialize sidebar on load and after sending messages
  refreshSidebar();
  
  // Recover last session on page load
  recoverLastSession();
  
  // Load recent chats preview
  loadRecentChatsPreview();
  
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
    const statusBar = document.getElementById('status-bar');
    
    // Add polling animation
    if (statusBar) {
      statusBar.classList.add('polling');
    }
    
    try {
      const response = await fetch('/api/system_stats');
      const stats = await response.json();
      
      // Remove polling animation after brief delay
      setTimeout(() => {
        if (statusBar) {
          statusBar.classList.remove('polling');
        }
      }, 300);
      
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
      
      // Update Tokens per Second (always show)
      const tokensContainer = document.getElementById('status-tokens-container');
      const tokensEl = document.getElementById('status-tokens');
      if (tokensContainer) tokensContainer.style.display = 'flex';
      if (tokensEl) {
        const tokensValue = stats.tokens_per_sec !== null && stats.tokens_per_sec !== undefined 
          ? `${stats.tokens_per_sec.toFixed(1)} t/s` 
          : '-- t/s';
        tokensEl.textContent = tokensValue;
        tokensEl.className = 'status-value';
        tokensEl.parentElement.title = `Tokens per Second: ${stats.tokens_per_sec || '--'}`;
      }
      
      // Update Context Used (always show)
      const contextContainer = document.getElementById('status-context-container');
      const contextEl = document.getElementById('status-context');
      if (contextContainer) contextContainer.style.display = 'flex';
      if (contextEl) {
        contextEl.textContent = stats.context_used || '--';
        contextEl.className = 'status-value';
        contextEl.parentElement.title = `Context: ${stats.context_used}`;
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
  
  // Performance Panel Update Function
  function updatePerfPanel(stats) {
    const update = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '--';
    };
    
    const updateWithClass = (id, val, getClass) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val ?? '--';
        if (getClass && val !== '--') {
          el.className = `perf-value ${getClass(parseFloat(val))}`;
        } else {
          el.className = 'perf-value';
        }
      }
    };
    
    // JONS2 System Metrics with color coding
    updateWithClass('cpu-val', stats.cpu !== null ? `${stats.cpu}%` : '--', (v) => getLoadClass(v));
    updateWithClass('mem-val', stats.memory !== null ? `${stats.memory}%` : '--', (v) => getLoadClass(v));
    updateWithClass('gpu-val', stats.gpu !== null ? `${stats.gpu}%` : '--', (v) => getLoadClass(v));
    update('vram-val', stats.vram_used_mb !== null ? `${stats.vram_used_mb} MB` : '--');
    update('fan-val', stats.fan_speed_pct !== null ? `${stats.fan_speed_pct.toFixed(1)}%` : '--');
    updateWithClass('cpu-temp-val', stats.cpu_temp !== null ? `${stats.cpu_temp}°C` : '--', (v) => getLoadClass(v, 'temp'));
    updateWithClass('gpu-temp-val', stats.gpu_temp !== null ? `${stats.gpu_temp}°C` : '--', (v) => getLoadClass(v, 'temp'));
    update('power-val', stats.power_draw !== null ? `${stats.power_draw.toFixed(1)}W` : '--');
    
    // Throttle with warning class
    const throttleEl = document.getElementById('throttle-val');
    if (throttleEl) {
      throttleEl.textContent = stats.thermal_throttled ? 'YES' : 'NO';
      throttleEl.className = stats.thermal_throttled ? 'perf-value warning' : 'perf-value';
    }
    
    // JoeyAI Model Metrics
    update('tps-val', stats.tokens_per_sec !== null ? `${stats.tokens_per_sec.toFixed(1)}` : '--');
    update('ctx-val', stats.context_used || '--');
    update('model-val', stats.model || '--');
    update('lat-val', stats.latency > 0 ? `${stats.latency.toFixed(2)}s` : '--');
    
    // Status with color
    const statusEl = document.getElementById('status-val');
    if (statusEl) {
      statusEl.textContent = stats.status || '--';
      if (stats.status === 'online') {
        statusEl.className = 'perf-value low';  // Green
      } else if (stats.status === 'offline') {
        statusEl.className = 'perf-value high';  // Red
      } else {
        statusEl.className = 'perf-value';
      }
    }
  }
  
  // Enhanced system status update with perf panel and status indicator
  const originalUpdateSystemStatus = updateSystemStatus;
  updateSystemStatus = async function() {
    await originalUpdateSystemStatus();
    
    // Also update performance panel and status indicator
    try {
      const response = await fetch('/api/system_stats');
      const stats = await response.json();
      updatePerfPanel(stats);
      updateStatusIndicator(stats.status);
    } catch (error) {
      console.error('Failed to update perf panel:', error);
      updateStatusIndicator('offline');
    }  
  };
  
  // Start polling system stats every second
  updateSystemStatus(); // Initial update
  statusBarUpdateInterval = setInterval(updateSystemStatus, 1000);
  
  // ========== Phase 4A: Dashboard Enhancements ==========
  
  // Dashboard summary update function
  async function updateDashboardSummary() {
    try {
      const response = await fetch('/api/dashboard/summary');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const summary = await response.json();
      
      // Update summary bar
      const summaryChats = document.getElementById('summary-chats');
      if (summaryChats) {
        summaryChats.textContent = `${summary.active_chats} active | ${summary.archived_chats} archived`;
      }
      
      const summaryLastTitle = document.getElementById('summary-last-title');
      if (summaryLastTitle) {
        const title = summary.last_title || 'None';
        summaryLastTitle.textContent = title.length > 25 ? title.substring(0, 22) + '...' : title;
        summaryLastTitle.title = title;
      }
      
      const summaryUptime = document.getElementById('summary-uptime');
      if (summaryUptime) {
        summaryUptime.textContent = `${summary.uptime_h}h`;
      }
      
      const summaryTokens = document.getElementById('summary-tokens');
      if (summaryTokens) {
        summaryTokens.textContent = summary.session_tokens.toLocaleString();
      }
      
      // Update analytics section
      const analyticsAvgTps = document.getElementById('analytics-avg-tps');
      if (analyticsAvgTps) {
        analyticsAvgTps.textContent = summary.avg_tokens_sec > 0 ? summary.avg_tokens_sec.toFixed(1) : '--';
      }
      
      const analyticsAvgLatency = document.getElementById('analytics-avg-latency');
      if (analyticsAvgLatency) {
        analyticsAvgLatency.textContent = summary.avg_latency_ms > 0 ? `${summary.avg_latency_ms}ms` : '--';
      }
      
      const analyticsSessionTokens = document.getElementById('analytics-session-tokens');
      if (analyticsSessionTokens) {
        analyticsSessionTokens.textContent = summary.session_tokens.toLocaleString();
      }
      
      // Update charts
      updateCharts(summary.tokens_history, summary.latency_history);
      
    } catch (error) {
      console.error('[DASHBOARD] Error updating summary:', error);
    }
  }
  
  // Chart drawing function
  function updateCharts(tokensHistory, latencyHistory) {
    // Update tokens/s chart
    const tokensCanvas = document.getElementById('tokens-chart');
    if (tokensCanvas && tokensHistory && tokensHistory.length > 0) {
      const ctx = tokensCanvas.getContext('2d');
      const width = tokensCanvas.width;
      const height = tokensCanvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw chart
      drawMiniChart(ctx, tokensHistory, width, height, '#4de0ff');
    }
    
    // Update latency chart
    const latencyCanvas = document.getElementById('latency-chart');
    if (latencyCanvas && latencyHistory && latencyHistory.length > 0) {
      const ctx = latencyCanvas.getContext('2d');
      const width = latencyCanvas.width;
      const height = latencyCanvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw chart
      drawMiniChart(ctx, latencyHistory, width, height, '#f59e0b');
    }
  }
  
  // Mini chart drawing helper
  function drawMiniChart(ctx, data, width, height, color) {
    if (!data || data.length === 0) return;
    
    const padding = 10;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Find min/max for scaling
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal || 1; // Avoid division by zero
    
    // Calculate points
    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
      return { x, y };
    });
    
    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = color;
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw baseline
    ctx.strokeStyle = 'rgba(77, 224, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
  }
  
  // Update header info from settings
  function updateHeaderInfo() {
    const headerModel = document.getElementById('header-model');
    const headerTemp = document.getElementById('header-temp');
    
    if (headerModel && modelSelect) {
      const model = modelSelect.value || 'qwen2.5:7b-instruct';
      const shortModel = model.length > 25 ? model.substring(0, 22) + '...' : model;
      headerModel.textContent = `Model: ${shortModel}`;
      headerModel.title = `Model: ${model}`;
    }
    
    if (headerTemp && temperatureSlider) {
      headerTemp.textContent = `Temp: ${temperatureSlider.value}`;
    }
  }
  
  // Update status indicator
  function updateStatusIndicator(status) {
    const statusIndicator = document.getElementById('status-indicator');
    if (!statusIndicator) return;
    
    // Remove all status classes
    statusIndicator.classList.remove('connected', 'degraded', 'offline');
    
    // Add appropriate class
    if (status === 'online') {
      statusIndicator.classList.add('connected');
      statusIndicator.querySelector('.status-text').textContent = 'Connected';
      statusIndicator.title = 'Connected to JONS2 @ 10.0.0.32:11434';
    } else if (status === 'degraded') {
      statusIndicator.classList.add('degraded');
      statusIndicator.querySelector('.status-text').textContent = 'Degraded';
      statusIndicator.title = 'Connection degraded';
    } else {
      statusIndicator.classList.add('offline');
      statusIndicator.querySelector('.status-text').textContent = 'Offline';
      statusIndicator.title = 'Backend offline';
    }
  }
  
  // Analytics toggle functionality
  const analyticsToggle = document.getElementById('analytics-toggle');
  const analyticsContent = document.getElementById('analytics-content');
  
  if (analyticsToggle && analyticsContent) {
    analyticsToggle.addEventListener('click', () => {
      analyticsToggle.classList.toggle('collapsed');
      analyticsContent.classList.toggle('collapsed');
      
      // Save state to localStorage
      const isCollapsed = analyticsToggle.classList.contains('collapsed');
      localStorage.setItem('joeyai-analytics-collapsed', isCollapsed ? 'true' : 'false');
    });
    
    // Restore collapsed state from localStorage
    const savedState = localStorage.getItem('joeyai-analytics-collapsed');
    if (savedState === 'true') {
      analyticsToggle.classList.add('collapsed');
      analyticsContent.classList.add('collapsed');
    }
  }
  
  // Update header on model/temp changes
  if (modelSelect) {
    modelSelect.addEventListener('change', updateHeaderInfo);
  }
  
  if (temperatureSlider) {
    temperatureSlider.addEventListener('input', updateHeaderInfo);
  }
  
  // Initialize dashboard
  updateHeaderInfo();
  updateDashboardSummary();
  
  // Poll dashboard summary every 30 seconds
  setInterval(updateDashboardSummary, 30000);
  
  console.log('[DASHBOARD] Phase 4A enhancements initialized');
  
  // ========== SETTINGS MODAL FUNCTIONALITY ==========
  
  const settingsModal = document.getElementById('settingsModal');
  const settingsModalClose = document.getElementById('settingsModalClose');
  const settingsModelSelect = document.getElementById('settings-model');
  const settingsTemperatureSlider = document.getElementById('settings-temperature');
  const settingsTemperatureValue = document.getElementById('settings-temperature-value');
  const settingsAutoSaveCheckbox = document.getElementById('settings-auto-save');
  const settingsThemeSelect = document.getElementById('settings-theme');
  const settingsMemoryLimitInput = document.getElementById('settings-memory-limit');
  const settingsSaveBtn = document.getElementById('settings-save-btn');
  const settingsResetBtn = document.getElementById('settings-reset-btn');
  const settingsCancelBtn = document.getElementById('settings-cancel-btn');
  
  let currentSettings = null;
  
  // Load settings from backend
  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const settings = await response.json();
      currentSettings = settings;
      
      // Store in localStorage for instant restore
      localStorage.setItem('joeyai-settings', JSON.stringify(settings));
      
      return settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      
      // Try to load from localStorage as fallback
      const cached = localStorage.getItem('joeyai-settings');
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Return defaults if all else fails
      return {
        model: 'qwen2.5:7b-instruct',
        temperature: 0.7,
        auto_save: true,
        theme: 'dark',
        memory_limit: 10
      };
    }
  }
  
  // Apply settings to UI
  function applySettings(settings) {
    // Apply model (sync with main model select)
    if (modelSelect && settings.model) {
      modelSelect.value = settings.model;
    }
    
    // Apply temperature (sync with main temperature slider)
    if (temperatureSlider && settings.temperature !== undefined) {
      temperatureSlider.value = settings.temperature;
      if (temperatureValue) {
        temperatureValue.textContent = settings.temperature;
      }
    }
    
    // Apply auto-save
    const autosaveToggle = document.getElementById('autosave-toggle');
    if (autosaveToggle && settings.auto_save !== undefined) {
      autosaveToggle.checked = settings.auto_save;
    }
    
    // Apply theme
    applyTheme(settings.theme || 'dark');
    
    console.log('[USER_SETTINGS] Applied settings:', settings);
  }
  
  // Apply theme to body
  function applyTheme(theme) {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('theme-dark', 'theme-light', 'theme-system');
    
    if (theme === 'system') {
      // Detect system theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    } else {
      body.classList.add(`theme-${theme}`);
    }
    
    console.log('[USER_SETTINGS] Theme applied:', theme);
  }
  
  // Populate settings modal with current settings
  async function populateSettingsModal() {
    const settings = currentSettings || await loadSettings();
    
    // Populate model dropdown (reuse models from main dropdown)
    if (settingsModelSelect && modelSelect) {
      settingsModelSelect.innerHTML = modelSelect.innerHTML;
      settingsModelSelect.value = settings.model || '';
    }
    
    // Populate temperature
    if (settingsTemperatureSlider && settings.temperature !== undefined) {
      settingsTemperatureSlider.value = settings.temperature;
      if (settingsTemperatureValue) {
        settingsTemperatureValue.textContent = settings.temperature.toFixed(2);
      }
    }
    
    // Populate auto-save
    if (settingsAutoSaveCheckbox && settings.auto_save !== undefined) {
      settingsAutoSaveCheckbox.checked = settings.auto_save;
    }
    
    // Populate theme
    if (settingsThemeSelect && settings.theme) {
      settingsThemeSelect.value = settings.theme;
    }
    
    // Populate memory limit
    if (settingsMemoryLimitInput && settings.memory_limit !== undefined) {
      settingsMemoryLimitInput.value = settings.memory_limit;
    }
  }
  
  // Open settings modal
  function openSettingsModal() {
    if (!settingsModal) return;
    
    populateSettingsModal();
    settingsModal.classList.remove('hidden');
    settingsModal.setAttribute('aria-hidden', 'false');
  }
  
  // Close settings modal
  function closeSettingsModal() {
    if (!settingsModal) return;
    
    settingsModal.classList.add('hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
  }
  
  // Save settings
  async function saveSettings() {
    try {
      const newSettings = {
        model: settingsModelSelect?.value || 'qwen2.5:7b-instruct',
        temperature: parseFloat(settingsTemperatureSlider?.value || 0.7),
        auto_save: settingsAutoSaveCheckbox?.checked ?? true,
        theme: settingsThemeSelect?.value || 'dark',
        memory_limit: parseInt(settingsMemoryLimitInput?.value || 10)
      };
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const savedSettings = await response.json();
      currentSettings = savedSettings;
      
      // Update localStorage
      localStorage.setItem('joeyai-settings', JSON.stringify(savedSettings));
      
      // Apply settings to UI
      applySettings(savedSettings);
      
      // Close modal
      closeSettingsModal();
      
      // Show success toast
      showToast('Settings saved successfully', 'success');
      
      console.log('[USER_SETTINGS] Saved:', savedSettings);
      
    } catch (error) {
      console.error('[USER_SETTINGS] Save failed:', error);
      showToast(`Failed to save settings: ${error.message}`, 'error');
    }
  }
  
  // Reset settings to defaults
  async function resetSettings() {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const defaultSettings = await response.json();
      currentSettings = defaultSettings;
      
      // Update localStorage
      localStorage.setItem('joeyai-settings', JSON.stringify(defaultSettings));
      
      // Apply settings to UI
      applySettings(defaultSettings);
      
      // Repopulate modal
      populateSettingsModal();
      
      // Show success toast
      showToast('Settings reset to defaults', 'success');
      
      console.log('[USER_SETTINGS] Reset to defaults:', defaultSettings);
      
    } catch (error) {
      console.error('[USER_SETTINGS] Reset failed:', error);
      showToast(`Failed to reset settings: ${error.message}`, 'error');
    }
  }
  
  // Settings modal event listeners
  if (settingsModalClose) {
    settingsModalClose.addEventListener('click', closeSettingsModal);
  }
  
  if (settingsCancelBtn) {
    settingsCancelBtn.addEventListener('click', closeSettingsModal);
  }
  
  if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener('click', saveSettings);
  }
  
  if (settingsResetBtn) {
    settingsResetBtn.addEventListener('click', resetSettings);
  }
  
  // Close modal on background click
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }
  
  // Temperature slider update in settings modal
  if (settingsTemperatureSlider && settingsTemperatureValue) {
    settingsTemperatureSlider.addEventListener('input', (e) => {
      settingsTemperatureValue.textContent = parseFloat(e.target.value).toFixed(2);
    });
  }
  
  // Update gear menu to open settings modal
  if (gearMenu) {
    const settingsMenuItem = gearMenu.querySelector('[data-action="settings"]');
    if (settingsMenuItem) {
      // Replace the existing click handler
      const newSettingsItem = settingsMenuItem.cloneNode(true);
      settingsMenuItem.parentNode.replaceChild(newSettingsItem, settingsMenuItem);
      
      newSettingsItem.addEventListener('click', () => {
        closeGearMenu();
        openSettingsModal();
      });
    }
  }
  
  // Load and apply settings on page load
  (async () => {
    // Try to load from localStorage first for instant restore
    const cached = localStorage.getItem('joeyai-settings');
    if (cached) {
      try {
        const cachedSettings = JSON.parse(cached);
        applySettings(cachedSettings);
      } catch (error) {
        console.error('Failed to parse cached settings:', error);
      }
    }
    
    // Then load from backend (which will update if different)
    const settings = await loadSettings();
    applySettings(settings);
  })();
  
  // Listen for system theme changes when theme is set to 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (currentSettings && currentSettings.theme === 'system') {
      applyTheme('system');
    }
  });
  
  // ========== END SETTINGS MODAL FUNCTIONALITY ==========
  
  console.log('Chat send/stream event wiring initialized with enhanced DOM guards and rendering');
});
