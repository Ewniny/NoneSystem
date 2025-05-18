'use strict';
const ADMIN_CODE = '#ADMIN_EWNINYBR_15';
const CONFIG = {
    matrix: {
        chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()",
        fontSize: 20,
        dropSpeed: 1.5
    },
    security: {
        maxAttempts: 3,
        lockoutTime: 300000
    }
};

const GITHUB = {
    GIST_ID: 'b69653e3262ea9f425fa1cf445531c27',
    TOKEN: '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',
    API: 'https://api.github.com/gists'
};

class CyberSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('neuroUsers')) || {};
        // Восстанавливаем сессию админа
        this.admins = new Set(JSON.parse(localStorage.getItem('neuroAdmins')) || []);
        this.currentUser = null;
        this.nodes = new Map();
        this.sessions = new Map();
        this.lockouts = new Map();
        this.securityLevel = 100;
        this.syncInterval = setInterval(() => this.checkForUpdates(), 5000);
        this.backupInterval = setInterval(() => this.backupToGitHub(), 15000);
        this.userBadge = document.getElementById('userBadge');
        this.initValidationMessages();
        this.messages = [];
        this.initChat();
        this.initMatrix();
        this.initWebGL();
        this.setupAuthSystem();
        this.setupEventListeners();
        this.checkSession();
        this.setupHUD();
        this.animate();
    }
    async backupToGitHub() {
        try {
            const response = await fetch(`${GITHUB.API}/${GITHUB.GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${GITHUB.TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'chat.json': {
                            content: JSON.stringify(this.messages),
                            filename: "chat-backup.json"
                        }
                    }
                })
            });

            if (!response.ok) throw new Error('GitHub API error');
        
        } catch (error) {
            console.error('Backup error:', error);
            throw error;
        }
    }
    initChat() {
        const chatContainer = document.querySelector('.chat-container');
    
        // Делегирование событий для удаления
        chatContainer.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
            const messageId = e.target.closest('.message').dataset.id;
            this.deleteMessage(messageId);
            }
        });
        this.setupChatForm();
        this.loadChatHistory();
    }

    initMatrix() {
        const canvas = document.getElementById('matrixCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const chars = CONFIG.matrix.chars;
        const drops = new Array(Math.floor(canvas.width / 20)).fill(0);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0F0';
            ctx.font = `${CONFIG.matrix.fontSize}px monospace`;

            drops.forEach((y, i) => {
                ctx.fillText(
                    chars[Math.floor(Math.random() * chars.length)],
                    i * 20,
                    y * 20
                );
                drops[i] = y > canvas.height / 20 ? 0 : y + CONFIG.matrix.dropSpeed;
            });

            requestAnimationFrame(draw);
        };
        draw();
    }

    initWebGL() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('webgl-container').appendChild(this.renderer.domElement);

        const geometry = new THREE.IcosahedronGeometry(2, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true
        });
        this.core = new THREE.Mesh(geometry, material);
        this.scene.add(this.core);
        this.camera.position.z = 5;
    }

    setupAuthSystem() {
        this.setupAuthSwitcher();
        this.setupFormHandlers();
    }
    // Инициализация кастомной валидации
    initValidationMessages() {
        document.querySelectorAll('input[pattern]').forEach(input => {
            input.addEventListener('invalid', (e) => {
            const field = e.target;
            if (field.name === 'login') {
                field.setCustomValidity('Формат: 8 символов-4 символа (A-Z, 0-9)');
            } else {
                field.setCustomValidity('');
                }
            });
        });
    }
    setupAuthSwitcher() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchAuthMode(mode);
            });
        });
    }

    switchAuthMode(mode) {
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.dataset.mode === mode);
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

    setupFormHandlers() {
        this.setupForm('#loginForm', this.handleLogin.bind(this));
        this.setupForm('#registerForm', this.handleRegister.bind(this));
        this.setupForm('#recoveryForm', this.handleRecovery.bind(this));
    }

    setupForm(selector, handler) {
        const form = document.querySelector(selector);
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await handler(new FormData(form));
                    this.toggleUI(true);
                } catch (error) {
                    this.showError(error.message);
                }
            });
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'logout') this.handleLogout();
                if (btn.dataset.page) this.switchPage(btn.dataset.page);
            });
        });
    }
    setupChatForm() {
        const chatForm = document.getElementById('chatForm');
        const chatInput = chatForm.querySelector('input');
        const sendButton = chatForm.querySelector('button');

        // Обработчик для Enter и кнопки
        const handleSubmit = (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (message) {
                this.sendMessage(message);
                chatInput.value = '';
            }
        };

        chatForm.addEventListener('submit', handleSubmit);
        sendButton.addEventListener('click', handleSubmit);

        // Адаптация для мобильных устройств
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            chatInput.style.paddingRight = '70px';
            sendButton.style.display = 'block';
        }
    }   
    startChatAutoRefresh() {
        // Проверка обновлений каждые 10 секунд
        setInterval(() => this.checkForUpdates(), 10000);
    
        // Первая проверка сразу после загрузки
        this.checkForUpdates();
    }
    async checkForUpdates() {
        try {
            const response = await fetch(`${GITHUB.API}/${GITHUB.GIST_ID}`, {
                headers: {Authorization: `Bearer ${GITHUB.TOKEN}`}
                });
            const data = await response.json();
            const remoteMessages = JSON.parse(data.files['chat.json'].content);
            if (!response.ok) {
                if (response.status === 401) {
                    this.showError('Ошибка доступа! Обновите токен');
                    return;
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }
            // Определяем новые сообщения
            const newMessages = remoteMessages.filter(rm => 
                !this.messages.some(m => m.id === rm.id)
            );
        
            if (newMessages.length > 0) {
                this.messages = [...this.messages, ...newMessages];
                this.renderChat();
                this.showSystemAlert('Получены новые сообщения', 'info');
            }
        
            // Обновляем список пользователей
            this.updateUserList(remoteMessages);

        } catch (error) {
            if (error.message.includes('rate limit')) {
                this.showError('Превышен лимит запросов к GitHub');
            } else {
                this.showError('Ошибка синхронизации: ' + error.message);
            }
        
            // Пробуем использовать локальные данные
            const localMessages = JSON.parse(localStorage.getItem('chatHistory')) || [];
            if (localMessages.length > this.messages.length) {
                this.messages = localMessages;
                this.renderChat();
            }
        }   
    }

    updateUserList(messages) {
        const users = [...new Set(messages.map(m => m.sender))];
        const userList = document.getElementById('userList');
    
        userList.innerHTML = users.map(u => `
            <li class="${u === this.currentUser ? 'self' : ''}">
                ${u} ${this.admins.has(u) ? '<span class="admin-tag">ADMIN</span>' : ''}
            </li>
        `).join('');
    }
    async sendMessage(content) {
        try {
            const newMessage = {
                id: crypto.randomUUID(),
                sender: this.currentUser,
                content,
                timestamp: Date.now(),
                confirmed: false
            };

            // Локальное сохранение
            this.messages.push(newMessage);
            this.renderChat();
        
            // Синхронизация с GitHub
            await this.backupToGitHub();
            this.showSystemAlert('Сообщение отправлено', 'success');
        
            return true;

        } catch (error) {
            console.error("Ошибка отправки:", error);
            this.showError(`Ошибка сети: ${error.message}`);
            return false;
        }
    }   
     // Валидация формата логина
    validateLoginFormat(login) {
        return /^[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(login);
    }
    // Обновление отображения пользователя
    updateUserBadge() {
        this.userBadge.innerHTML = `
        <i class="fas fa-user"></i>
        ${this.currentUser}
        ${this.isAdmin() ? '<span class="admin-tag">ADMIN</span>' : ''}
        `;
    }
    // Проверка прав администратора
    isAdmin() {
        return this.admins.has(this.currentUser);
    }
    // Удаление сообщений
    deleteMessage(messageId) {
        if (!this.isAdmin()) {
          this.showError('Требуются права администратора!');
          return;
        }

        this.messages = this.messages.filter(msg => msg.id !== messageId);
        this.saveChat();
        this.renderChat(); // Полный перерендер чата
    }
    // Модифицированный рендер сообщений
    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender === this.currentUser ? 'self' : ''}`;
        messageDiv.dataset.id = message.id;
    
        messageDiv.innerHTML = `
        <div class="msg-header">
            <span class="sender">${message.sender}</span>
            ${this.isAdmin() ? `
            <button class="delete-btn">
                <i class="fas fa-skull"></i>
            </button>` : ''}
            <span class="time">${new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="msg-content">${message.content}</div>
        `;

        return messageDiv;
    }
    renderChat() {
        const container = document.querySelector('.chat-container');
        container.innerHTML = '';
    
        this.messages.forEach(msg => {
            const msgElement = this.renderMessage(msg);
            container.appendChild(msgElement);
        });
    
        // Автоскролл только если пользователь внизу
        const isScrolledUp = container.scrollTop + container.clientHeight < container.scrollHeight - 100;
        if (!isScrolledUp) {
        container.scrollTop = container.scrollHeight;
        }
    }
    async saveChat() {
        // Локальное сохранение
        localStorage.setItem('chatHistory', JSON.stringify(this.messages));
    
        // Синхронизация с GitHub
        try {
            await this.backupToGitHub();
        } catch (error) {
            console.log("Сохранено локально. GitHub недоступен.");
        }
    }
    async loadChatHistory() {
        try {
            this.messages = JSON.parse(localStorage.getItem('chatHistory')) || [];
            this.messages.forEach(msg => this.renderMessage(msg));
        } catch (error) {
            console.error('Ошибка загрузки чата:', error);
        }
    }
    
    // Исправленная система аутентификации
    async handleLogin(formData) {
        const login = formData.get('login').trim().toUpperCase();
        const password = formData.get('password').trim();

        if (!this.validateLoginFormat(login)) {
            this.showError('Неверный формат идентификатора!');
            return;
        }

        const user = this.users[login];
        if (!user || !(await this.verifyPassword(password, user.password))) {
            this.handleFailedAttempt(login);
            throw new Error('Неверные учетные данные');
        }
        this.currentUser = login;
        this.updateUserBadge();
        this.startSession(login);
        this.showSystemAlert(`Добро пожаловать, ${login}!`, 'success');
    }
    // Сохранение сессии
    startSession(login) {
        sessionStorage.setItem('neuroUser', JSON.stringify({
            login,
            isAdmin: this.isAdmin()
        }));
    
        // Сохраняем админов в localStorage
        localStorage.setItem('neuroAdmins', JSON.stringify([...this.admins]));
    }

    isAdmin() {
        return this.admins.has(this.currentUser);
    }


    showSystemAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `system-alert ${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}"></i>
            ${message}
        `;
        
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    // Исправленный метод проверки сессии
    checkSession() {
        const sessionData = sessionStorage.getItem('neuroSession');
        if (sessionData) {
            try {
                const { token, user } = JSON.parse(sessionData);
                if (this.sessions.has(token) && this.users[user]) {
                    this.currentUser = user;
                    this.toggleUI(true);
                    return true;
                }
            } catch (e) {
                sessionStorage.removeItem('neuroSession');
            }
        }
        return false;
    }

    async handleRegister(formData) {
        try {
            const login = formData.get('newLogin').trim().toUpperCase();
            const password = formData.get('newPassword');
            const confirm = formData.get('confirmPassword');

            // Валидация формата логина
            if (!/^[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(login)) {
                throw new Error('Неверный формат идентификатора! Пример: ABCD1234-5678');
            }

            // Проверка совпадения паролей
            if (password !== confirm) {
                throw new Error('Криптографические ключи не совпадают');
            }

            // Проверка существующего пользователя
            if (this.users[login]) {
                throw new Error('Нейро-идентификатор уже существует');
            }

            // Хеширование пароля
            const hashedPassword = await this.hashPassword(password);

            // Создание записи пользователя
            this.users[login] = {
                password: hashedPassword,
                created: Date.now(),
                securityLevel: 1,
                lastLogin: null
            };


            // Сохранение данных
            localStorage.setItem('neuroUsers', JSON.stringify(this.users));

            // Автоматический вход
            this.startSession(login);
            this.showSystemAlert(`Сектор ${login} успешно создан`, 'success');
            this.switchPage('chat');

        } catch (error) {
            this.showError(error.message);
            throw error; // Для повторной обработки в вызывающем коде
        }
    }

    async handleRecovery(formData) {
        const code = formData.get('code').trim();
        if (!this.validateRecoveryCode(code)) {
            throw new Error('Недействительный код восстановления');
        }
        this.activateEmergencyAccess();
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-512', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verifyPassword(input, storedHash) {
        const inputHash = await this.hashPassword(input);
        return inputHash === storedHash;
    }

    startSession(login) {
        const sessionToken = crypto.randomUUID();
        this.sessions.set(sessionToken, {
            login,
            startTime: Date.now(),
            lastActivity: Date.now()
        });

        sessionStorage.setItem('neuroSession', JSON.stringify({
            token: sessionToken,
            user: login
        }));

        this.currentUser = login;
        this.toggleUI(true);
    }

    toggleUI(loggedIn) {
        document.getElementById('auth-container').style.display = loggedIn ? 'none' : 'block';
        document.getElementById('mainInterface').style.display = loggedIn ? 'block' : 'none';
    }

    handleFailedAttempt(login) {
        const attempts = this.lockouts.get(login) || { count: 0, timestamp: 0 };
        attempts.count++;
        attempts.timestamp = Date.now();
        this.lockouts.set(login, attempts);

        if (attempts.count >= CONFIG.security.maxAttempts) {
            setTimeout(() => {
                this.lockouts.delete(login);
            }, CONFIG.security.lockoutTime);
            throw new Error(`Аккаунт заблокирован на ${CONFIG.security.lockoutTime/60000} минут`);
        }
    }

    isAccountLocked(login) {
        const lock = this.lockouts.get(login);
        return lock && lock.count >= CONFIG.security.maxAttempts;
    }

    activateEmergencyAccess() {
        this.currentUser = 'EMERGENCY';
        sessionStorage.setItem('neuroEmergency', JSON.stringify({
            timestamp: Date.now()
        }));
        this.toggleUI(true);
    }

    checkSession() {
        const session = JSON.parse(sessionStorage.getItem('neuroSession'));
        if (session && this.users[session.user]) {
            this.currentUser = session.user;
            this.toggleUI(true);
        }
    }

    handleLogout() {
        sessionStorage.removeItem('neuroSession');
        this.currentUser = null;
        this.toggleUI(false);
    }

    switchPage(page) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `${page}Page`);
        });
    }

    setupHUD() {
        this.hudElements = {
            security: document.querySelector('.hud-bar.security'),
            network: document.querySelector('.hud-bar.network'),
            memory: document.querySelector('.hud-bar.memory')
        };

        setInterval(() => {
            this.securityLevel = Math.min(100, Math.max(0, 
                this.securityLevel + (Math.random() - 0.5) * 2
            ));
            this.updateHUD();
        }, 2000);
    }

    updateHUD() {
        this.hudElements.security.style.width = `${this.securityLevel}%`;
        this.hudElements.security.style.backgroundColor = 
            this.securityLevel > 75 ? '#0F0' :
            this.securityLevel > 50 ? '#bc13fe' : 
            '#ff003c';
    }

    onWindowResize() {
        // Матрица
        const canvas = document.getElementById('matrixCanvas');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        // WebGL
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Чат
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.core.rotation.x += 0.01;
        this.core.rotation.y += 0.01;
        this.renderer.render(this.scene, this.camera);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    validateRecoveryCode(code) {
        const validCodes = JSON.parse(localStorage.getItem('emergencyCodes')) || [];
        return validCodes.some(c => c.code === code && c.expires > Date.now());
    }

    async syncWithGitHub() {
        try {
            const response = await fetch(`${GITHUB.API}/${GITHUB.GIST_ID}`, {
                headers: { Authorization: `token ${GITHUB.TOKEN}` }
            });
            const data = await response.json();
            this.nodes = new Map(JSON.parse(data.files['network.json'].content));
        } catch (error) {
            this.showError('Ошибка синхронизации с GitHub');
        }
    }

    async backupToGitHub() {
        try {
            await fetch(`${GITHUB.API}/${GITHUB.GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `token ${GITHUB.TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: { 'network.json': { content: JSON.stringify([...this.nodes]) } }
                })
            });
        } catch (error) {
            this.showError('Ошибка резервного копирования');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        new CyberSystem();
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'system-failure';
        errorDiv.textContent = 'КРИТИЧЕСКИЙ СБОЙ СИСТЕМЫ';
        document.body.appendChild(errorDiv);
    }
});
