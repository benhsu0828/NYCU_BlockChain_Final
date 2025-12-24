 // Chat room related functions
let chatSubscription = null;

// Initialize chat room
function initChat() {
    const chatInput = document.getElementById('chatInput');
    
    // Listen for Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChat();
        }
    });
}

// Send chat message
async function sendChat() {
    if (!currentAccount) {
        showToast("Please select account first", "warning");
        return;
    }
    
    if (currentGameId === null) {
        showToast("Please load game first", "warning");
        return;
    }
    
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) {
        showToast("Please enter message", "warning");
        return;
    }
    
    try {
        showToast("⏳ Sending message...", "info");
        
        await contract.methods.sendChat(currentGameId, message).send({
            from: currentAccount,
            gas: 3000000
        });
        
        // Clear input box
        chatInput.value = '';
        
        showToast("✓ Message sent", "success");
        showToast("⚠ Please remember to run mining command to confirm transaction", "warning");
        
    } catch (error) {
        console.error("Failed to send message:", error);
        showToast("✗ Failed to send message: " + error.message, "error");
    }
}

// Load chat history
async function loadChatHistory() {
    if (currentGameId === null) return;
    
    try {
        // Cancel old subscription
        if (chatSubscription) {
            chatSubscription.unsubscribe();
        }
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '<div class="chat-loading">Loading chat history...</div>';
        
        // Get historical ChatSent events
        const events = await contract.getPastEvents('ChatSent', {
            filter: { gameId: currentGameId },
            fromBlock: 0,
            toBlock: 'latest'
        });
        
        // Clear message area
        chatMessages.innerHTML = '';
        
        if (events.length === 0) {
            chatMessages.innerHTML = '<div class="chat-empty">No chat messages yet</div>';
        } else {
            // Display messages in chronological order
            events.forEach(event => {
                addChatMessage(
                    event.returnValues.sender,
                    event.returnValues.message,
                    event.returnValues.moveNumber,
                    event.blockNumber
                );
            });
        }
        
        // Subscribe to new messages
        subscribeToChatEvents();
        
    } catch (error) {
        console.error("Failed to load chat history:", error);
        document.getElementById('chatMessages').innerHTML = 
            '<div class="chat-error">Failed to load chat history</div>';
    }
}

// Subscribe to chat events
function subscribeToChatEvents() {
    if (currentGameId === null) return;
    
    chatSubscription = contract.events.ChatSent({
        filter: { gameId: currentGameId },
        fromBlock: 'latest'
    })
    .on('data', (event) => {
        const { sender, message, moveNumber } = event.returnValues;
        addChatMessage(sender, message, moveNumber, event.blockNumber);
        
        // Play notification sound (optional)
        playNotificationSound();
    })
    .on('error', console.error);
}

// Add chat message to display area
function addChatMessage(sender, message, moveNumber, blockNumber) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Remove empty message prompt
    const emptyMsg = chatMessages.querySelector('.chat-empty, .chat-loading');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    // Determine if it's current user's message
    const isCurrentUser = sender.toLowerCase() === currentAccount?.toLowerCase();
    if (isCurrentUser) {
        messageDiv.classList.add('chat-message-self');
    }
    
    const time = new Date().toLocaleTimeString();
    
    messageDiv.innerHTML = `
        <div class="chat-message-header">
            <span class="chat-sender" title="${sender}">
                ${isCurrentUser ? 'Me' : formatAddress(sender)}
            </span>
            <span class="chat-time">${time}</span>
            <span class="chat-move-number">Move #${moveNumber}</span>
        </div>
        <div class="chat-message-content">${escapeHtml(message)}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Auto scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escape HTML special characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Play notification sound (optional implementation)
function playNotificationSound() {
    // Can add sound playback logic
    // For example: new Audio('notification.mp3').play();
}

// Clear chat messages
function clearChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '<div class="chat-empty">No chat messages yet</div>';
}
