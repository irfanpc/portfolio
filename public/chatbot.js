const API_BASE_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:8001' : '';

// Widget Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chatbot-toggle');
    const chatWrapper = document.getElementById('chatbot-widget');
    const chatCloseBtn = document.getElementById('chatbot-close');

    if (chatToggle && chatWrapper) {
        chatToggle.addEventListener('click', () => {
            chatWrapper.classList.toggle('hidden');
        });
        
        if (chatCloseBtn) {
            chatCloseBtn.addEventListener('click', () => {
                chatWrapper.classList.add('hidden');
            });
        }
    }
});

const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const ticketPanel = document.getElementById('ticket-panel');
const cancelTicketBtn = document.getElementById('cancel-ticket-btn');
const submitTicketBtn = document.getElementById('submit-ticket-btn');
const ticketEmail = document.getElementById('ticket-email');
const ticketSummary = document.getElementById('ticket-summary');

// 1. Session Management
let sessionId = localStorage.getItem('support_session_id');
if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('support_session_id', sessionId);
}

// 2. Load History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/history/${sessionId}`);
        if (response.ok) {
            const data = await fetch(`${API_BASE_URL}/history/${sessionId}`).then(res => res.json());
            if (data.messages && data.messages.length > 0) {
                // Clear welcome message if there is history
                chatContainer.innerHTML = '';
                data.messages.forEach(msg => {
                    appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
                });
            }
        }
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

// 3. UI Helpers
function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role === 'user' ? 'user-message' : 'ai-message');
    
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    
    // Remove markdown asterisks to clean up the output
    const cleanText = text.replace(/\*/g, '');
    bubble.textContent = cleanText;
    
    msgDiv.appendChild(bubble);
    chatContainer.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatContainer.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// 4. Send Message
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message to UI
    appendMessage('user', text);
    chatInput.value = '';
    
    showTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, message: text })
        });
        
        const data = await response.json();
        hideTypingIndicator();
        
        appendMessage('ai', data.response);

        if (data.is_escalated) {
            ticketPanel.classList.remove('hidden');
        }

    } catch (error) {
        hideTypingIndicator();
        appendMessage('ai', "Sorry, I couldn't connect to the server. Please try again later.");
        console.error("Chat error:", error);
    }
}

// 5. Ticket System
async function submitTicket() {
    const email = ticketEmail.value.trim();
    const summary = ticketSummary.value.trim();

    if (!email || !summary) {
        alert("Please fill in both fields.");
        return;
    }

    try {
        submitTicketBtn.textContent = 'Submitting...';
        submitTicketBtn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                user_email: email,
                issue_summary: summary
            })
        });

        if (response.ok) {
            ticketPanel.innerHTML = '<h3 style="color: #10b981;">Ticket Submitted Successfully</h3><p>Our team will contact you shortly.</p>';
            setTimeout(() => {
                ticketPanel.classList.add('hidden');
            }, 3000);
        } else {
            throw new Error("Failed to submit ticket");
        }
    } catch (error) {
        alert("Error submitting ticket. Please try again.");
        submitTicketBtn.textContent = 'Submit Ticket';
        submitTicketBtn.disabled = false;
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

cancelTicketBtn.addEventListener('click', () => {
    ticketPanel.classList.add('hidden');
});

submitTicketBtn.addEventListener('click', submitTicket);

// Initialize
loadHistory();
