require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// AI Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
    console.warn("WARNING: GEMINI_API_KEY not found in .env. AI will return mock responses.");
}

// Firebase Configuration
const FIREBASE_CRED_PATH = process.env.FIREBASE_CREDENTIALS_PATH;
let db = null;

if (FIREBASE_CRED_PATH && fs.existsSync(FIREBASE_CRED_PATH)) {
    try {
        const serviceAccount = require(FIREBASE_CRED_PATH);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        console.log("Firebase initialized successfully.");
    } catch (e) {
        console.error("Error initializing Firebase:", e);
    }
} else {
    console.warn("WARNING: Firebase credentials not found. Using in-memory fallback database.");
}

// In-Memory Fallback Database
const memoryDb = {
    history: {},  // session_id -> array of messages
    tickets: []   // array of tickets
};

const ESCALATION_MESSAGE = "Let me connect you with a human support agent for further assistance.";

let resumeData = "";
try {
    resumeData = fs.readFileSync(path.join(__dirname, 'resume_data.txt'), 'utf8');
} catch (e) {
    console.warn("Could not read resume_data.txt", e);
}

const SYSTEM_PROMPT = `You are a professional personal assistant.
Your ONLY purpose is to answer questions about the person you represent, their qualifications, portfolio, and skills.

CRITICAL INSTRUCTION: Your answers MUST be extremely short (maximum 1-2 sentences) and use very simple, easy-to-understand language. Do not provide long or brief detailed explanations. Just give the exact information the user needs quickly. Use bullet points only if absolutely necessary.

--- KNOWLEDGE BASE ---
${resumeData}
-----------------------

CRITICAL RULE: If the user asks ANY question that is NOT related to the professional portfolio you represent, you MUST decline to answer. 
However, if the user simply says hello, greets you, or asks who you are, politely greet them back and introduce yourself as Irfan's AI Assistant, ready to answer questions about his portfolio!
For off-topic questions, respond politely with something like: "I'm sorry, but I can only answer questions related to Irfan's professional portfolio." Do NOT answer general knowledge questions.

PROJECTS RULE: If the user asks about Irfan's projects, list the projects he has done, and ALWAYS end your response with exactly this sentence: "He is currently working on an AI Chatbot (AI/ML)."

If the user wishes to speak with the person directly or leave a detailed message, you MUST escalate the issue. To escalate, respond EXACTLY with the following sentence and nothing else:
"Let me connect you with a human support agent for further assistance."`;

async function getHistory(sessionId) {
    if (db) {
        const docRef = db.collection('chats').doc(sessionId);
        const doc = await docRef.get();
        if (doc.exists) {
            return doc.data().messages || [];
        }
        return [];
    } else {
        return memoryDb.history[sessionId] || [];
    }
}

async function saveHistory(sessionId, messages, isEscalated = false) {
    if (db) {
        await db.collection('chats').doc(sessionId).set({
            messages: messages,
            is_escalated: isEscalated
        }, { merge: true });
    } else {
        memoryDb.history[sessionId] = messages;
    }
}

async function saveTicket(sessionId, issueSummary, userEmail) {
    const ticketData = {
        session_id: sessionId,
        issue_summary: issueSummary,
        user_email: userEmail,
        status: "open",
        created_at: new Date().toISOString()
    };
    if (db) {
        await db.collection('tickets').add(ticketData);
        await db.collection('chats').doc(sessionId).set({ is_escalated: true }, { merge: true });
    } else {
        memoryDb.tickets.push(ticketData);
    }
}

async function callAI(messages) {
    if (!genAI) {
        const lastMsg = messages[messages.length - 1].content.toLowerCase();
        if (lastMsg.includes("escalate")) {
            return ESCALATION_MESSAGE;
        }
        return "This is a mock AI response. Please get your Gemini API key and add it to your backend/.env file to enable the real AI.";
    }

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT
        });
        
        // Convert history to Gemini format (excluding the last user message which is sent directly)
        const geminiHistory = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
        
        const chat = model.startChat({ history: geminiHistory });
        const lastMessage = messages[messages.length - 1].content;
        
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        return response.text().trim();
    } catch (e) {
        console.error("Error calling AI:", e);
        if (e.status === 429 || (e.message && e.message.includes('429'))) {
            return "My daily Google API limit has been reached (20 requests/day). I will be back online tomorrow! " + ESCALATION_MESSAGE;
        }
        return "I'm having trouble connecting right now. " + ESCALATION_MESSAGE;
    }
}

app.post('/chat', async (req, res) => {
    try {
        const { session_id, message } = req.body;
        if (!session_id || !message) {
            return res.status(400).json({ error: "session_id and message are required" });
        }

        const history = await getHistory(session_id);
        history.push({ role: "user", content: message });

        const aiResponseText = await callAI(history);
        history.push({ role: "ai", content: aiResponseText });

        const isEscalated = aiResponseText.trim() === ESCALATION_MESSAGE;

        await saveHistory(session_id, history, isEscalated);

        res.json({
            response: aiResponseText,
            is_escalated: isEscalated
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post('/ticket', async (req, res) => {
    try {
        const { session_id, issue_summary, user_email } = req.body;
        if (!session_id || !issue_summary || !user_email) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        await saveTicket(session_id, issue_summary, user_email);
        res.json({ message: "Ticket created successfully", session_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/history/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        const history = await getHistory(session_id);
        res.json({ session_id, messages: history });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
