/**
 * Keyboard Shortcuts Module for Joey_AI
 * Provides keyboard shortcuts for common actions
 */

(function() {
  'use strict';
  
  // Keyboard shortcut definitions
  const shortcuts = {
    'Ctrl+Enter': 'Send message',
    'Ctrl+K': 'New conversation',
    'Ctrl+/': 'Show shortcuts help',
    'Escape': 'Close modals',
    'Ctrl+E': 'Export current conversation',
    'Ctrl+D': 'Delete current conversation'
  };
  
  /**
   * Initialize keyboard shortcuts
   */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcut);
    console.log('Keyboard shortcuts initialized');
  }
  
  /**
   * Handle keyboard shortcut events
   * @param {KeyboardEvent} e - The keyboard event
   */
  function handleKeyboardShortcut(e) {
    // Ctrl+Enter: Send message
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      const sendBtn = document.getElementById('send-btn');
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      }
      return;
    }
    
    // Ctrl+K: New conversation
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const newConvBtn = document.getElementById('new-conversation-btn');
      if (newConvBtn) {
        newConvBtn.click();
      }
      return;
    }
    
    // Ctrl+/: Show shortcuts help
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      showShortcutsModal();
      return;
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
      closeAllModals();
      return;
    }
    
    // Ctrl+E: Export current conversation
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      exportCurrentConversation();
      return;
    }
    
    // Ctrl+D: Delete current conversation (with confirmation)
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      deleteCurrentConversation();
      return;
    }
  }
  
  /**
   * Show shortcuts help modal
   */
  function showShortcutsModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('shortcuts-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'false');
    
    const modalContent = `
      <div class="modal-dialog" style="max-width: 500px;">
        <div class="modal-header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button id="shortcuts-modal-close" class="icon-btn" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; padding: 8px;">
            ${Object.entries(shortcuts).map(([key, desc]) => `
              <div style="display: contents;">
                <div style="text-align: right; font-weight: 600; color: var(--glow, #4de0ff); font-family: monospace; font-size: 13px;">${key}</div>
                <div style="color: var(--text, #333); font-size: 14px;">${desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
    
    // Add close handler
    const closeBtn = document.getElementById('shortcuts-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), 300);
      });
    }
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), 300);
      }
    });
  }
  
  /**
   * Close all open modals
   */
  function closeAllModals() {
    const modals = document.querySelectorAll('.modal:not(.hidden)');
    modals.forEach(modal => {
      modal.classList.add('hidden');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.remove();
        }
      }, 300);
    });
    
    // Also close gear menu if open
    const gearMenu = document.getElementById('gear-menu');
    if (gearMenu && !gearMenu.classList.contains('hidden')) {
      gearMenu.classList.add('hidden');
    }
  }
  
  /**
   * Export current conversation
   */
  function exportCurrentConversation() {
    // Get current conversation ID from global scope
    const conversationId = window.currentConversationId;
    
    if (!conversationId) {
      showToast('No conversation selected', 'warning');
      return;
    }
    
    // Trigger download
    window.location.href = `/conversations/${conversationId}/export`;
    showToast('Exporting conversation...', 'info');
  }
  
  /**
   * Delete current conversation with confirmation
   */
  function deleteCurrentConversation() {
    const conversationId = window.currentConversationId;
    
    if (!conversationId) {
      showToast('No conversation selected', 'warning');
      return;
    }
    
    if (confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      fetch(`/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      .then(response => response.json())
      .then(() => {
        showToast('Conversation deleted', 'success');
        
        // Clear chat and reset conversation ID
        const msgs = document.getElementById('messages');
        if (msgs) msgs.innerHTML = '';
        
        window.currentConversationId = null;
        document.body.classList.remove('has-started');
        
        // Refresh sidebar
        if (window.refreshSidebar) {
          window.refreshSidebar();
        }
      })
      .catch(error => {
        console.error('Delete failed:', error);
        showToast('Failed to delete conversation', 'error');
      });
    }
  }
  
  /**
   * Show toast notification
   * @param {string} message - The message to display
   * @param {string} type - Toast type (success, error, warning, info)
   */
  function showToast(message, type = 'info') {
    // Use existing showToast if available
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    
    // Fallback implementation
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKeyboardShortcuts);
  } else {
    initKeyboardShortcuts();
  }
  
  // Export functions to global scope for other scripts to use
  window.showShortcutsModal = showShortcutsModal;
  window.exportCurrentConversation = exportCurrentConversation;
  window.deleteCurrentConversation = deleteCurrentConversation;
  
})();
