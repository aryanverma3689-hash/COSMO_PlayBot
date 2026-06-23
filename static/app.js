document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const moodBtns = document.querySelectorAll('.mood-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    const headerTitle = document.getElementById('header-title');
    const headerStatus = document.getElementById('header-status');
    const avatar = document.querySelector('.avatar');

    let currentMode = 0;

    const personas = {
        0: { title: "Professional GOAT", status: "Online and ready to help", theme: "theme-default" },
        1: { title: "Angry GOAT", status: "Do not test my patience", theme: "theme-angry" },
        2: { title: "Funny GOAT", status: "Ready to crack a joke!", theme: "theme-funny" },
        3: { title: "Sad GOAT", status: "Sigh... I'm here if you need me", theme: "theme-sad" }
    };

    async function loadHistory() {
        try {
            const response = await fetch('/history');
            const data = await response.json();
            
            // Set mode
            currentMode = data.mode;
            const persona = personas[currentMode];
            document.body.className = persona.theme;
            headerTitle.textContent = persona.title;
            headerStatus.textContent = persona.status;
            
            // Update mode buttons
            moodBtns.forEach(b => b.classList.remove('active'));
            const activeBtn = Array.from(moodBtns).find(b => parseInt(b.dataset.mode) === currentMode);
            if (activeBtn) activeBtn.classList.add('active');

            // Render messages
            if (data.messages && data.messages.length > 0) {
                chatMessages.innerHTML = ''; // Clear default welcome
                data.messages.forEach(msg => {
                    const type = msg.type; // 'human', 'ai', 'system'
                    if (type === 'human') {
                        appendUserMessage(msg.data.content);
                    } else if (type === 'ai') {
                        appendBotMessage(msg.data.content);
                    }
                });
            }
        } catch (error) {
            console.error("Failed to load history:", error);
        }
    }

    loadHistory();

    // Toggle Send Button
    userInput.addEventListener('input', () => {
        sendBtn.disabled = userInput.value.trim() === '';
    });

    // Handle Mood Selection
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update mode
            currentMode = parseInt(btn.dataset.mode);
            const persona = personas[currentMode];

            // Update UI
            document.body.className = persona.theme;
            headerTitle.textContent = persona.title;
            headerStatus.textContent = persona.status;

            // Optional: Send a visual notification in chat that persona changed
            appendSystemMessage(`Switched to ${persona.title} persona.`);
        });
    });

    // Handle Reset
    resetBtn.addEventListener('click', async () => {
        try {
            await fetch('/reset', { method: 'POST' });
            chatMessages.innerHTML = '';
            appendBotMessage("Session reset. How can I assist you today?");
        } catch (error) {
            console.error("Failed to reset:", error);
        }
    });

    // Form Submit
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message to UI
        appendUserMessage(message);
        userInput.value = '';
        sendBtn.disabled = true;

        // Show typing indicator
        const typingId = appendTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    mode: currentMode
                })
            });

            const data = await response.json();
            
            // Remove typing indicator
            removeElement(typingId);

            if (data.error) {
                appendSystemMessage(data.reply);
            } else {
                appendBotMessage(data.reply);
            }
        } catch (error) {
            removeElement(typingId);
            appendSystemMessage("Connection error. Is the backend running?");
        }
    });

    function appendUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-user"></i>
            </div>
            <div class="message-content">
                <p>${escapeHTML(text)}</p>
            </div>
        `;
        chatMessages.appendChild(div);
        scrollToBottom();
    }

    function appendBotMessage(text) {
        const div = document.createElement('div');
        div.className = 'message bot-message';
        div.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${formatText(escapeHTML(text))}</p>
            </div>
        `;
        chatMessages.appendChild(div);
        scrollToBottom();
    }

    function appendSystemMessage(text) {
        const div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.color = 'var(--text-secondary)';
        div.style.fontSize = '0.8rem';
        div.style.margin = 'var(--spacing-md) 0';
        div.textContent = text;
        chatMessages.appendChild(div);
        scrollToBottom();
    }

    function appendTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.className = 'message bot-message';
        div.id = id;
        div.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatMessages.appendChild(div);
        scrollToBottom();
        return id;
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    function formatText(text) {
        // Simple formatting to handle newlines
        return text.replace(/\n/g, '<br>');
    }
});
