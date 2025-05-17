class VoidSystem {
    constructor() {
        this.entity = {
            accessLevel: 0,
            failCount: 0,
            selfDestruct: false,
            secrets: {
                login: "43 68 6f 73 65 6e 4f 6e 65",
                pass: "736563726574313233",
                accessKey: "ZXdydHl1aW8="
            }
        };
    }

    init() {
        this.setupMatrixEffect();
        this.setupEventListeners();
        setInterval(() => this.updateMetrics(), 2000);
    }

    setupMatrixEffect() {
        const chars = '01░▒▓█╳⛶';
        const matrix = document.getElementById('matrix');
        
        setInterval(() => {
            const span = document.createElement('span');
            span.style = `left: ${Math.random() * 100}%;
                animation: fall ${3 + Math.random() * 5}s linear infinite;`;
            span.textContent = chars[Math.floor(Math.random()*chars.length)];
            matrix.appendChild(span);
            setTimeout(() => span.remove(), 5000);
        }, 100);
    }

    updateMetrics() {
        document.querySelectorAll('.progress-fill').forEach(bar => {
            bar.style.width = `${Math.random() * 80 + 10}%`;
        });
    }

    executeVoidCommand() {
        const input = document.getElementById('commandInput').value;
        let output = `<span class="glitch-text">> ${input}</span><br>`;
        
        if(this.entity.selfDestruct) {
            output += "СИСТЕМА ЗАБЛОКИРОВАНА<br>";
            document.getElementById('terminalOutput').innerHTML += output;
            return;
        }

        if(/ewniny|создатель/i.test(input)) {
            this.entity.failCount++;
            output += "ДОСТУП ЗАПРЕЩЁН<br>";
            output += `<span class="hex-msg">${this.generateHexTeasing()}</span>`;
        }

        if(input === "login ChosenOne" && this.entity.accessLevel === 0) {
            this.entity.accessLevel++;
            output += "ЛОГИН ПРИНЯТ. ВВЕДИТЕ ПАРОЛЬ (ШИФР: HEX->ASCII)";
        }

        if(input === "password secret123" && this.entity.accessLevel === 1) {
            output += "ДОСТУП 1/2 ОДОБРЕН. ОЖИДАЙТЕ КВАНТОВОЙ СВЯЗИ<br>";
            output += `<span class="hex-msg">54 68 65 20 41 72 63 68 69 74 65 63 74 20 69 73 20 77 61 74 63 68 69 6e 67</span>`;
            setTimeout(() => showCreatorProfile(), 5000);
        }

        document.getElementById('terminalOutput').innerHTML += output + "<br>";
        document.getElementById('commandInput').value = '';

        if(this.entity.failCount > 2) this.activateSelfDestruct();
    }

    generateHexTeasing() {
        const messages = [
            "45 57 4e 49 4e 59 5f 53 45 45 53 5f 41 4c 4c",
            "59 6f 75 27 72 65 20 6e 6f 74 20 77 6f 72 74 68 79",
            "44 65 6c 65 74 69 6e 67 20 75 73 65 72 5f 64 61 74 61"
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    activateSelfDestruct() {
        this.entity.selfDestruct = true;
        document.getElementById('terminalOutput').innerHTML += 
            `<span class="warning">САМОУНИЧТОЖЕНИЕ ЧЕРЕЗ 60 СЕКУНД</span><br>`;
        
        let count = 60;
        const timer = setInterval(() => {
            document.getElementById('terminalOutput').innerHTML += 
                `> СИСТЕМА ОТКАЗЫВАЕТ: ${count--}<br>`;
            if(count < 0) {
                clearInterval(timer);
                document.body.innerHTML = '<h1 class="glitch-text">SYSTEM TERMINATED</h1>';
            }
        }, 1000);
    }

    setupEventListeners() {
        document.getElementById('commandInput').addEventListener('keypress', (e) => {
            if(e.key === 'Enter') this.executeVoidCommand();
        });
    }
}
class SecuritySystem {
    constructor() {
        this.attempts = 0;
        this.blocked = false;
        this.users = JSON.parse(localStorage.getItem('voidUsers')) || {};
    }

    register(login, pass) {
        if (this.blocked) return this.showError('Система заблокирована');
        
        // Защита от брутфорса
        if (this.attempts >= 3) {
            this.activateCaptcha();
            return this.showError('Требуется подтверждение');
        }

        // Валидация данных
        if (!/^[a-zA-Z0-9]{4,20}$/.test(login)) {
            this.attempts++;
            return this.showError('Некорректный логин');
        }

        if (pass.length < 8) {
            this.attempts++;
            return this.showError('Слабый пароль');
        }

        // Хеширование пароля
        const hash = btoa(encodeURIComponent(pass + login));
        this.users[login] = { hash, attempts: 0 };
        localStorage.setItem('voidUsers', JSON.stringify(this.users));
        
        // Активация 2FA
        this.activate2FA(login);
    }

    activateCaptcha() {
        document.getElementById('captcha').classList.add('captcha-active');
        this.blocked = true;
        setTimeout(() => {
            this.blocked = false;
            this.attempts = 0;
        }, 60000);
    }

    activate2FA(login) {
        const code = Math.floor(100000 + Math.random() * 900000);
        // Здесь должна быть интеграция с API SMS
        alert(`Код подтверждения: ${code}`);
        this.verify2FA(code, login);
    }

    verify2FA(code, login) {
        const enteredCode = prompt('Введите код из SMS');
        if (enteredCode == code) {
            showPage('chat');
            sessionStorage.setItem('authToken', btoa(login));
        } else {
            this.showError('Неверный код');
            delete this.users[login];
        }
    }

    showError(message) {
        const status = document.getElementById('securityStatus');
        status.style.display = 'block';
        status.textContent = `⚠️ ${message}`;
    }
}

// Инициализация системы
const security = new SecuritySystem();
// Веб-сокет чат (имитация)
function sendMessage() {
    if (!sessionStorage.getItem('authToken')) return;
    
    const input = document.getElementById('chatInput');
    const message = {
        user: atob(sessionStorage.getItem('authToken')),
        text: input.value,
        time: new Date().toLocaleTimeString()
    };
    
    // Эмуляция отправки
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-message';
    msgElement.innerHTML = `
        <span class="msg-user">${message.user}</span>
        <span class="msg-time">${message.time}</span>
        <div class="msg-text">${message.text}</div>
    `;
    
    document.getElementById('chatMessages').appendChild(msgElement);
    input.value = '';
}

// Адаптер для мобильных устройств
function mobileAdapt() {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile');
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.style.fontSize = '12px';
        });
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    mobileAdapt();
    if (!sessionStorage.getItem('authToken')) showPage('auth');
});
// Инициализация системы
document.addEventListener('DOMContentLoaded', () => {
    const voidSystem = new VoidSystem();
    voidSystem.init();
});

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active-page');
    });
    const activePage = document.getElementById(pageId);
    activePage.style.display = 'block';
    setTimeout(() => activePage.classList.add('active-page'), 10);
}

function showCreatorProfile() {
    document.getElementById('creatorProfile').style.display = 'block';
    document.querySelector('.quantum-portrait').style.animation = 'entity-pulse 2s infinite';
}