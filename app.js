import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { 
    getDatabase, 
    ref, 
    push, 
    onValue, 
    onDisconnect,
    set 
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@2.4.3/dist/purify.min.js';

const firebaseConfig = {
    apiKey: "AIzaSyDoYJUZvfODd9uqzMvH0Drw3fz6ruZJfBI",
    authDomain: "ewninyarg.firebaseapp.com",
    databaseURL: "https://ewninyarg-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ewninyarg",
    storageBucket: "ewninyarg.firebasestorage.app",
    messagingSenderId: "1092242784203",
    appId: "1:1092242784203:web:9561a4a6a300650bc5804e",
    measurementId: "G-2GDKKQVPV0"
};

class CyberChat {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getDatabase(this.app);
        this.messagesRef = ref(this.db, 'messages');
        this.userId = this.generateUserId();
        this.presenceRef = null;
        this.initMatrix();
        this.initChat();
        this.setupPresence();
    }

    // XSS защита
    sanitize(input) {
        return DOMPurify.sanitize(input, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
    }   

    generateUserId() {
        const storedId = localStorage.getItem('anonymousId');
        if(storedId) return this.sanitize(storedId);
        
        const newId = 'user-' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('anonymousId', newId);
        return newId;
    }
    initChat() {
                const form = document.getElementById('chatForm');
                const input = document.querySelector('.chat-input');
                
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const message = input.value.trim();
                    if(message) {
                        if(message.startsWith('/nick ')) {
                            const newNick = message.split(' ')[1];
                            if(newNick) this.updateNickname(newNick);
                        } else {
                            this.sendMessage(message);
                        }
                        input.value = '';
                    }
                });

                onValue(messagesRef, (snapshot) => {
                    this.messages = Object.values(snapshot.val() || {});
                    this.renderChat();
                });
            }

    async updateNickname(newNick) {
        const sanitizedNick = this.sanitize(newNick.substring(0, 20));
        this.userId = sanitizedNick;
        localStorage.setItem('anonymousId', sanitizedNick);
        
        if(this.presenceRef) {
            try {
                await set(this.presenceRef, sanitizedNick);
            } catch(error) {
                console.error('Ошибка обновления ника:', error);
            }
        }
    }
    setupChatForm() {
                const form = document.getElementById('chatForm');
                const input = document.querySelector('.chat-input');
                
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const message = input.value.trim();
                    if(message) {
                        this.sendMessage(message);
                        input.value = '';
                    }
                });
            }
    async sendMessage(content) {
        try {
         await push(messagesRef, {
            userId: this.userId,
            content: this.sanitize(content),
            timestamp: Date.now()
         });
        } catch(error) {
            onsole.error("Ошибка отправки:", error);
        }
    }
    renderChat() {
        const container = document.querySelector('.chat-container');
        container.innerHTML = '';
        
        this.messages.forEach(msg => {
            const msgElement = document.createElement('div');
            msgElement.className = `message ${msg.userId === this.userId ? 'self' : ''}`;
            
            // Безопасное создание элементов
            const header = document.createElement('div');
            header.className = 'msg-header';
            
            const userIdSpan = document.createElement('span');
            userIdSpan.className = 'user-id';
            userIdSpan.textContent = this.sanitize(msg.userId);
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'time';
            timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString();
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'msg-content';
            contentDiv.textContent = this.sanitize(msg.content);
            
            header.append(userIdSpan, timeSpan);
            msgElement.append(header, contentDiv);
            container.appendChild(msgElement);
        });
        
        container.scrollTop = container.scrollHeight;
    }

    setupPresence() {
        try {
            const connectionsRef = ref(this.db, 'connections');
            this.presenceRef = push(connectionsRef);
            
            set(this.presenceRef, this.userId)
                .catch(error => console.error('Presence error:', error));

            onDisconnect(this.presenceRef).remove()
                .catch(error => console.error('OnDisconnect error:', error));

            onValue(connectionsRef, (snapshot) => {
                const users = [];
                snapshot.forEach(child => {
                    const val = child.val();
                    if(val) users.push(this.sanitize(val));
                });
                this.renderOnlineUsers(users);
            });
        } catch(error) {
            console.error('Presence system error:', error);
        }
    }

    renderOnlineUsers(users) {
        const countElement = document.getElementById('onlineCount');
        if(countElement) {
            countElement.textContent = users.length;
        }
    }
}

// Инициализация после полной загрузки DOM
window.addEventListener('DOMContentLoaded', () => {
    new CyberChat();
});