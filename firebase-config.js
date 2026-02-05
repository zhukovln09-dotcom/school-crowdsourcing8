// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBTo2O08Zm_pZ9RQz-FH31dFewrA65eKI0",
  authDomain: "school-crowdsourcing6.firebaseapp.com",
  projectId: "school-crowdsourcing6",
  storageBucket: "school-crowdsourcing6.firebasestorage.app",
  messagingSenderId: "773385595435",
  appId: "1:773385595435:web:4f350f89fc5a938b30586e",
  measurementId: "G-7806P3HP72"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Инициализация сервисов
const auth = firebase.auth();
const db = firebase.firestore();

// Настройки Firestore
db.settings({
    timestampsInSnapshots: true
});

// Глобальные переменные
let currentUser = null;
let currentIdeaId = null;

// Проверка авторизации при загрузке
auth.onAuthStateChanged((user) => {
    if (user) {
        // Пользователь вошел
        currentUser = user;
        showApp();
        loadUserData(user.uid);
    } else {
        // Пользователь вышел
        currentUser = null;
        showAuth();
    }
});

// Показать форму авторизации
function showAuth() {
    document.getElementById('authPanel').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    showLogin();
}

// Показать основное приложение
function showApp() {
    document.getElementById('authPanel').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadIdeas();
}

// Показать форму входа
function showLogin() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === 'login') {
            tab.classList.add('active');
        }
    });
}

// Показать форму регистрации
function showRegister() {
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === 'register') {
            tab.classList.add('active');
        }
    });
}

// Загрузка данных пользователя
async function loadUserData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Обновляем интерфейс
            document.getElementById('userName').textContent = userData.name || 'Пользователь';
            document.getElementById('userRole').textContent = getRoleLabel(userData.role);
            document.getElementById('userRole').className = `user-role role-${userData.role}`;
            
            // Сохраняем данные пользователя
            currentUser = {
                ...currentUser,
                ...userData
            };
        } else {
            // Создаем запись пользователя если нет
            await createUserProfile(userId);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

// Создание профиля пользователя
async function createUserProfile(userId) {
    try {
        const user = auth.currentUser;
        const defaultData = {
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            role: 'student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            ideasCount: 0,
            votesCount: 0,
            commentsCount: 0
        };
        
        await db.collection('users').doc(userId).set(defaultData);
        
        // Обновляем интерфейс
        document.getElementById('userName').textContent = defaultData.name;
        document.getElementById('userRole').textContent = getRoleLabel(defaultData.role);
        document.getElementById('userRole').className = `user-role role-${defaultData.role}`;
    } catch (error) {
        console.error('Ошибка создания профиля:', error);
    }
}

// Получить текстовое название роли
function getRoleLabel(role) {
    const roles = {
        'student': 'ученик',
        'teacher': 'учитель',
        'parent': 'родитель',
        'admin': 'администратор'
    };
    return roles[role] || role;
}

// Экспорт для использования в других файлах
window.firebaseAuth = auth;
window.firebaseDb = db;
window.currentUser = () => currentUser;
window.showLogin = showLogin;
window.showRegister = showRegister;
