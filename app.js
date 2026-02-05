// Основное приложение на Firebase

class FirebaseCrowdsourcingApp {
    constructor() {
        this.currentIdeaId = null;
        this.filters = {
            category: 'all',
            status: 'all',
            sortBy: 'newest'
        };
        this.init();
    }

    init() {
        console.log('🚀 Firebase приложение инициализировано');
        
        // Настройка обработчиков
        this.setupEventListeners();
        
        // Начальная загрузка данных
        this.setupFilters();
        
        // Делаем доступным глобально
        window.app = this;
    }

    setupEventListeners() {
        // Кнопка выхода
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Форма добавления идеи
        document.getElementById('submitIdeaBtn').addEventListener('click', () => this.submitIdea());
        
        // Форма комментария
        document.getElementById('commentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComment();
        });
        
        // Фильтры
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        
        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').style.display = 'none';
            });
        });
        
        // Закрытие по клику вне окна
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        // Вкладки авторизации
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                if (tabName === 'login') {
                    showLogin();
                } else {
                    showRegister();
                }
            });
        });
        
        // Кнопка входа
        document.getElementById('loginBtn').addEventListener('click', () => this.login());
        
        // Кнопка регистрации
        document.getElementById('registerBtn').addEventListener('click', () => this.register());
        
        // Enter для форм авторизации
        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        
        document.getElementById('registerConfirm').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.register();
        });
    }

    setupFilters() {
        // Загружаем сохраненные фильтры
        const savedFilters = localStorage.getItem('ideaFilters');
        if (savedFilters) {
            this.filters = JSON.parse(savedFilters);
            this.updateFilterUI();
        }
    }

    updateFilterUI() {
        document.getElementById('filterCategory').value = this.filters.category;
        document.getElementById('filterStatus').value = this.filters.status;
        document.getElementById('sortBy').value = this.filters.sortBy;
    }

    // ========== АВТОРИЗАЦИЯ ==========

    async login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const errorElement = document.getElementById('loginError');
        
        if (!email || !password) {
            errorElement.textContent = 'Заполните все поля';
            return;
        }
        
        errorElement.textContent = '';
        document.getElementById('loginBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
        document.getElementById('loginBtn').disabled = true;
        
        try {
            await firebaseAuth.signInWithEmailAndPassword(email, password);
            // Авторизация успешна - onAuthStateChanged автоматически вызовет showApp()
        } catch (error) {
            console.error('Ошибка входа:', error);
            
            let errorMessage = 'Ошибка входа';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Аккаунт отключен';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Пользователь не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Неверный пароль';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            errorElement.textContent = errorMessage;
        } finally {
            document.getElementById('loginBtn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            document.getElementById('loginBtn').disabled = false;
        }
    }

    async register() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();
        const confirmPassword = document.getElementById('registerConfirm').value.trim();
        const role = document.getElementById('registerRole').value;
        const errorElement = document.getElementById('registerError');
        
        // Валидация
        if (!name || !email || !password || !confirmPassword) {
            errorElement.textContent = 'Заполните все поля';
            return;
        }
        
        if (password.length < 6) {
            errorElement.textContent = 'Пароль должен быть не менее 6 символов';
            return;
        }
        
        if (password !== confirmPassword) {
            errorElement.textContent = 'Пароли не совпадают';
            return;
        }
        
        errorElement.textContent = '';
        document.getElementById('registerBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
        document.getElementById('registerBtn').disabled = true;
        
        try {
            // Создаем пользователя
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Создаем профиль в Firestore
            await firebaseDb.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                ideasCount: 0,
                votesCount: 0,
                commentsCount: 0,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Обновляем отображаемое имя
            await user.updateProfile({
                displayName: name
            });
            
            console.log('✅ Пользователь зарегистрирован:', user.uid);
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            
            let errorMessage = 'Ошибка регистрации';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email уже используется';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Пароль слишком слабый';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            errorElement.textContent = errorMessage;
        } finally {
            document.getElementById('registerBtn').innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('registerBtn').disabled = false;
        }
    }

    async logout() {
        try {
            await firebaseAuth.signOut();
            console.log('✅ Пользователь вышел');
        } catch (error) {
            console.error('Ошибка выхода:', error);
            this.showError('Ошибка при выходе');
        }
    }

    // ========== РАБОТА С ИДЕЯМИ ==========

    async loadIdeas() {
        try {
            console.log('📥 Загружаем идеи...');
            
            let query = firebaseDb.collection('ideas');
            
            // Применяем фильтры
            if (this.filters.category !== 'all') {
                query = query.where('category', '==', this.filters.category);
            }
            
            if (this.filters.status !== 'all') {
                query = query.where('status', '==', this.filters.status);
            }
            
            // Применяем сортировку
            switch (this.filters.sortBy) {
                case 'newest':
                    query = query.orderBy('createdAt', 'desc');
                    break;
                case 'popular':
                    query = query.orderBy('votesCount', 'desc');
                    break;
                case 'votes':
                    query = query.orderBy('votesCount', 'desc');
                    break;
                case 'comments':
                    query = query.orderBy('commentsCount', 'desc');
                    break;
            }
            
            const snapshot = await query.limit(50).get();
            const ideas = [];
            
            snapshot.forEach(doc => {
                ideas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`✅ Загружено ${ideas.length} идей`);
            this.displayIdeas(ideas);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки идей:', error);
            this.showError('Не удалось загрузить идеи');
        }
    }

    displayIdeas(ideas) {
        const container = document.getElementById('ideasContainer');
        
        if (!ideas || ideas.length === 0) {
            container.innerHTML = `
                <div class="no-ideas">
                    <i class="fas fa-inbox"></i>
                    <h3>Пока нет идей</h3>
                    <p>Будьте первым, кто предложит идею!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = ideas.map(idea => {
            const isCurrentUser = currentUser() && currentUser().uid === idea.authorId;
            const hasVoted = idea.votes && idea.votes[currentUser()?.uid];
            const canDelete = isCurrentUser || (currentUser() && currentUser().role === 'admin');
            
            return `
                <div class="idea-card" data-id="${idea.id}">
                    <div class="idea-header">
                        <div class="idea-title-section">
                            <h3 class="idea-title">${this.escapeHtml(idea.title)}</h3>
                            <span class="idea-category badge-category-${idea.category}">
                                ${this.getCategoryLabel(idea.category)}
                            </span>
                        </div>
                        <div class="idea-meta">
                            <span class="idea-status badge-status-${idea.status}">
                                ${this.getStatusLabel(idea.status)}
                            </span>
                            ${canDelete ? `
                                <button class="btn-icon btn-delete" onclick="app.deleteIdea('${idea.id}')" 
                                        title="Удалить идею">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="idea-content">
                        <p class="idea-description">${this.escapeHtml(idea.description)}</p>
                        
                        <div class="idea-author-info">
                            <i class="fas fa-user"></i>
                            <span class="idea-author">${this.escapeHtml(idea.authorName)}</span>
                            <span class="idea-date">${this.formatDate(idea.createdAt)}</span>
                        </div>
                    </div>
                    
                    <div class="idea-stats">
                        <span class="idea-stat">
                            <i class="fas fa-thumbs-up"></i>
                            <span id="votes-${idea.id}">${idea.votesCount || 0}</span>
                        </span>
                        <span class="idea-stat">
                            <i class="fas fa-comments"></i>
                            <span id="comments-${idea.id}">${idea.commentsCount || 0}</span>
                        </span>
                        <span class="idea-stat">
                            <i class="fas fa-eye"></i>
                            <span>${idea.views || 0}</span>
                        </span>
                    </div>
                    
                    <div class="idea-actions">
                        <button class="btn-action btn-vote ${hasVoted ? 'voted' : ''}" 
                                onclick="app.voteForIdea('${idea.id}')"
                                ${!currentUser() ? 'disabled' : ''}>
                            <i class="fas fa-thumbs-up"></i>
                            ${hasVoted ? 'Вы поддержали' : 'Поддержать'}
                        </button>
                        
                        <button class="btn-action btn-comment" 
                                onclick="app.openComments('${idea.id}', '${this.escapeHtml(idea.title)}')">
                            <i class="fas fa-comments"></i> Обсудить
                        </button>
                        
                        <button class="btn-action btn-details" 
                                onclick="app.showIdeaDetails('${idea.id}')">
                            <i class="fas fa-info-circle"></i> Подробнее
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async submitIdea() {
        if (!currentUser()) {
            this.showError('Для добавления идеи необходимо войти в систему');
            return;
        }
        
        const title = document.getElementById('ideaTitle').value.trim();
        const description = document.getElementById('ideaDescription').value.trim();
        const category = document.getElementById('ideaCategory').value;
        
        // Валидация
        if (!title || !description) {
            this.showError('Заполните все обязательные поля');
            return;
        }
        
        if (title.length < 3) {
            this.showError('Название должно быть не менее 3 символов');
            return;
        }
        
        if (description.length < 10) {
            this.showError('Описание должно быть не менее 10 символов');
            return;
        }
        
        const submitBtn = document.getElementById('submitIdeaBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Публикую...';
        submitBtn.disabled = true;
        
        try {
            const user = currentUser();
            
            // Создаем идею в Firestore
            const ideaData = {
                title: title,
                description: description,
                category: category,
                authorId: user.uid,
                authorName: user.name || user.email,
                authorRole: user.role,
                status: 'pending',
                votesCount: 0,
                commentsCount: 0,
                views: 0,
                votes: {},
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await firebaseDb.collection('ideas').add(ideaData);
            
            // Обновляем счетчик идей пользователя
            await firebaseDb.collection('users').doc(user.uid).update({
                ideasCount: firebase.firestore.FieldValue.increment(1),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Очищаем форму
            document.getElementById('ideaTitle').value = '';
            document.getElementById('ideaDescription').value = '';
            
            // Показываем успех
            this.showMessage('🎉 Идея успешно опубликована!', 'success');
            
            // Перезагружаем список
            setTimeout(() => this.loadIdeas(), 1000);
            
        } catch (error) {
            console.error('❌ Ошибка добавления идеи:', error);
            this.showError('Не удалось добавить идею');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async voteForIdea(ideaId) {
        if (!currentUser()) {
            this.showError('Для голосования необходимо войти в систему');
            return;
        }
        
        const user = currentUser();
        
        try {
            const ideaRef = firebaseDb.collection('ideas').doc(ideaId);
            const ideaDoc = await ideaRef.get();
            
            if (!ideaDoc.exists) {
                this.showError('Идея не найдена');
                return;
            }
            
            const ideaData = ideaDoc.data();
            const hasVoted = ideaData.votes && ideaData.votes[user.uid];
            
            // Обновляем в транзакции
            await firebaseDb.runTransaction(async (transaction) => {
                const freshDoc = await transaction.get(ideaRef);
                const freshData = freshDoc.data();
                
                if (!freshData.votes) {
                    freshData.votes = {};
                }
                
                if (hasVoted) {
                    // Отменяем голос
                    delete freshData.votes[user.uid];
                    freshData.votesCount = (freshData.votesCount || 1) - 1;
                } else {
                    // Добавляем голос
                    freshData.votes[user.uid] = true;
                    freshData.votesCount = (freshData.votesCount || 0) + 1;
                }
                
                transaction.update(ideaRef, {
                    votes: freshData.votes,
                    votesCount: freshData.votesCount,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Обновляем счетчик голосов пользователя
                const userRef = firebaseDb.collection('users').doc(user.uid);
                transaction.update(userRef, {
                    votesCount: firebase.firestore.FieldValue.increment(hasVoted ? -1 : 1),
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            // Обновляем UI
            const votesElement = document.getElementById(`votes-${ideaId}`);
            if (votesElement) {
                const currentVotes = parseInt(votesElement.textContent) || 0;
                votesElement.textContent = hasVoted ? currentVotes - 1 : currentVotes + 1;
            }
            
            // Обновляем кнопку
            const voteBtn = document.querySelector(`.btn-vote[onclick*="${ideaId}"]`);
            if (voteBtn) {
                if (hasVoted) {
                    voteBtn.classList.remove('voted');
                    voteBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Поддержать';
                    this.showMessage('Голос отменен', 'info');
                } else {
                    voteBtn.classList.add('voted');
                    voteBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Вы поддержали';
                    this.showMessage('Спасибо за ваш голос! 💙', 'success');
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка голосования:', error);
            this.showError('Не удалось проголосовать');
        }
    }

    async deleteIdea(ideaId) {
        if (!currentUser()) return;
        
        if (!confirm('Вы уверены, что хотите удалить эту идею? Это действие нельзя отменить.')) {
            return;
        }
        
        try {
            await firebaseDb.collection('ideas').doc(ideaId).delete();
            
            // Обновляем счетчик пользователя
            const user = currentUser();
            await firebaseDb.collection('users').doc(user.uid).update({
                ideasCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            this.showMessage('Идея удалена', 'success');
            this.loadIdeas();
            
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            this.showError('Не удалось удалить идею');
        }
    }

    // ========== КОММЕНТАРИИ ==========

    async openComments(ideaId, title) {
        if (!currentUser()) {
            this.showError('Для комментариев необходимо войти в систему');
            return;
        }
        
        this.currentIdeaId = ideaId;
        
        // Обновляем заголовок
        document.getElementById('modalTitle').textContent = `Комментарии: ${title}`;
        
        // Очищаем старые комментарии
        const container = document.getElementById('commentsContainer');
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка комментариев...
            </div>
        `;
        
        // Показываем окно
        document.getElementById('commentModal').style.display = 'block';
        
        // Загружаем комментарии
        await this.loadComments(ideaId);
        
        // Увеличиваем счетчик просмотров
        this.incrementViews(ideaId);
    }

    async loadComments(ideaId) {
        try {
            const snapshot = await firebaseDb
                .collection('comments')
                .where('ideaId', '==', ideaId)
                .orderBy('createdAt', 'asc')
                .get();
            
            const comments = [];
            snapshot.forEach(doc => {
                comments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.displayComments(comments);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки комментариев:', error);
            
            const container = document.getElementById('commentsContainer');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Не удалось загрузить комментарии</p>
                </div>
            `;
        }
    }

    displayComments(comments) {
        const container = document.getElementById('commentsContainer');
        
        if (!comments || comments.length === 0) {
            container.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <p>Пока нет комментариев</p>
                    <p>Будьте первым!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = comments.map(comment => {
            const isAuthor = comment.authorId === currentUser()?.uid;
            
            return `
                <div class="comment" data-id="${comment.id}">
                    <div class="comment-header">
                        <div class="comment-author">
                            <i class="fas fa-user"></i>
                            <span>${this.escapeHtml(comment.authorName)}</span>
                            <span class="comment-role role-${comment.authorRole}">
                                ${this.getRoleLabel(comment.authorRole)}
                            </span>
                        </div>
                        <div class="comment-actions">
                            <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
                            ${isAuthor ? `
                                <button class="btn-icon btn-delete-comment" 
                                        onclick="app.deleteComment('${comment.id}')"
                                        title="Удалить комментарий">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                </div>
            `;
        }).join('');
    }

    async submitComment() {
        if (!currentUser() || !this.currentIdeaId) {
            this.showError('Ошибка добавления комментария');
            return;
        }
        
        const text = document.getElementById('commentText').value.trim();
        
        if (!text) {
            this.showError('Введите текст комментария');
            return;
        }
        
        if (text.length < 2) {
            this.showError('Комментарий должен быть не менее 2 символов');
            return;
        }
        
        const submitBtn = document.querySelector('#commentForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправляю...';
        submitBtn.disabled = true;
        
        try {
            const user = currentUser();
            
            // Создаем комментарий
            const commentData = {
                ideaId: this.currentIdeaId,
                text: text,
                authorId: user.uid,
                authorName: user.name || user.email,
                authorRole: user.role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await firebaseDb.collection('comments').add(commentData);
            
            // Обновляем счетчик комментариев идеи
            await firebaseDb.collection('ideas').doc(this.currentIdeaId).update({
                commentsCount: firebase.firestore.FieldValue.increment(1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Обновляем счетчик пользователя
            await firebaseDb.collection('users').doc(user.uid).update({
                commentsCount: firebase.firestore.FieldValue.increment(1),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Очищаем форму
            document.getElementById('commentText').value = '';
            
            // Показываем успех
            this.showMessage('💬 Комментарий добавлен!', 'success');
            
            // Перезагружаем комментарии
            await this.loadComments(this.currentIdeaId);
            
            // Обновляем счетчик на главной странице
            const commentsElement = document.getElementById(`comments-${this.currentIdeaId}`);
            if (commentsElement) {
                const currentCount = parseInt(commentsElement.textContent) || 0;
                commentsElement.textContent = currentCount + 1;
            }
            
        } catch (error) {
            console.error('❌ Ошибка добавления комментария:', error);
            this.showError('Не удалось добавить комментарий');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async deleteComment(commentId) {
        if (!currentUser() || !confirm('Удалить комментарий?')) return;
        
        try {
            await firebaseDb.collection('comments').doc(commentId).delete();
            
            // Обновляем счетчик комментариев идеи
            if (this.currentIdeaId) {
                await firebaseDb.collection('ideas').doc(this.currentIdeaId).update({
                    commentsCount: firebase.firestore.FieldValue.increment(-1)
                });
                
                // Обновляем счетчик пользователя
                const user = currentUser();
                await firebaseDb.collection('users').doc(user.uid).update({
                    commentsCount: firebase.firestore.FieldValue.increment(-1)
                });
                
                // Перезагружаем комментарии
                await this.loadComments(this.currentIdeaId);
                
                // Обновляем счетчик на главной
                const commentsElement = document.getElementById(`comments-${this.currentIdeaId}`);
                if (commentsElement) {
                    const currentCount = parseInt(commentsElement.textContent) || 0;
                    commentsElement.textContent = Math.max(0, currentCount - 1);
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка удаления комментария:', error);
            this.showError('Не удалось удалить комментарий');
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    async showIdeaDetails(ideaId) {
        try {
            const doc = await firebaseDb.collection('ideas').doc(ideaId).get();
            
            if (!doc.exists) {
                this.showError('Идея не найдена');
                return;
            }
            
            const idea = doc.data();
            const user = currentUser();
            const isAuthor = user && user.uid === idea.authorId;
            const isAdmin = user && user.role === 'admin';
            
            let detailsHTML = `
                <div class="idea-details">
                    <h2>${this.escapeHtml(idea.title)}</h2>
                    
                    <div class="idea-meta-details">
                        <span class="badge-category-${idea.category}">
                            ${this.getCategoryLabel(idea.category)}
                        </span>
                        <span class="badge-status-${idea.status}">
                            ${this.getStatusLabel(idea.status)}
                        </span>
                        <span class="idea-date">${this.formatDate(idea.createdAt)}</span>
                    </div>
                    
                    <div class="idea-description-details">
                        <h3>Описание:</h3>
                        <p>${this.escapeHtml(idea.description)}</p>
                    </div>
                    
                    <div class="idea-author-details">
                        <h3>Автор:</h3>
                        <p><i class="fas fa-user"></i> ${this.escapeHtml(idea.authorName)}</p>
                        <p><i class="fas fa-user-tag"></i> ${this.getRoleLabel(idea.authorRole)}</p>
                    </div>
                    
                    <div class="idea-stats-details">
                        <h3>Статистика:</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <i class="fas fa-thumbs-up"></i>
                                <span>${idea.votesCount || 0} голосов</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-comments"></i>
                                <span>${idea.commentsCount || 0} комментариев</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-eye"></i>
                                <span>${idea.views || 0} просмотров</span>
                            </div>
                        </div>
                    </div>
            `;
            
            // Добавляем панель управления для автора или админа
            if (isAuthor || isAdmin) {
                detailsHTML += `
                    <div class="idea-admin-panel">
                        <h3>Управление:</h3>
                        <div class="admin-actions">
                `;
                
                if (isAdmin) {
                    detailsHTML += `
                        <select id="changeStatus" class="status-select">
                            <option value="pending" ${idea.status === 'pending' ? 'selected' : ''}>На рассмотрении</option>
                            <option value="approved" ${idea.status === 'approved' ? 'selected' : ''}>Одобрено</option>
                            <option value="in_progress" ${idea.status === 'in_progress' ? 'selected' : ''}>В работе</option>
                            <option value="completed" ${idea.status === 'completed' ? 'selected' : ''}>Реализовано</option>
                            <option value="rejected" ${idea.status === 'rejected' ? 'selected' : ''}>Отклонено</option>
                        </select>
                        <button onclick="app.updateIdeaStatus('${ideaId}')" class="btn btn-secondary">
                            <i class="fas fa-save"></i> Сохранить статус
                        </button>
                    `;
                }
                
                detailsHTML += `
                        </div>
                    </div>
                `;
            }
            
            detailsHTML += `</div>`;
            
            document.getElementById('ideaDetailsContent').innerHTML = detailsHTML;
            document.getElementById('ideaDetailsModal').style.display = 'block';
            
            // Увеличиваем счетчик просмотров
            this.incrementViews(ideaId);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки деталей:', error);
            this.showError('Не удалось загрузить детали идеи');
        }
    }

    async updateIdeaStatus(ideaId) {
        if (!currentUser() || currentUser().role !== 'admin') return;
        
        const newStatus = document.getElementById('changeStatus').value;
        
        try {
            await firebaseDb.collection('ideas').doc(ideaId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.showMessage('Статус обновлен', 'success');
            this.loadIdeas();
            document.getElementById('ideaDetailsModal').style.display = 'none';
            
        } catch (error) {
            console.error('❌ Ошибка обновления статуса:', error);
            this.showError('Не удалось обновить статус');
        }
    }

    async incrementViews(ideaId) {
        try {
            await firebaseDb.collection('ideas').doc(ideaId).update({
                views: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Ошибка обновления просмотров:', error);
        }
    }

    applyFilters() {
        this.filters = {
            category: document.getElementById('filterCategory').value,
            status: document.getElementById('filterStatus').value,
            sortBy: document.getElementById('sortBy').value
        };
        
        // Сохраняем фильтры
        localStorage.setItem('ideaFilters', JSON.stringify(this.filters));
        
        // Применяем фильтры
        this.loadIdeas();
    }

    // ========== УТИЛИТЫ ==========

    getCategoryLabel(category) {
        const categories = {
            'general': 'Общее',
            'education': 'Учёба',
            'sports': 'Спорт',
            'food': 'Питание',
            'facility': 'Инфраструктура',
            'events': 'Мероприятия'
        };
        return categories[category] || category;
    }

    getStatusLabel(status) {
        const statuses = {
            'pending': 'На рассмотрении',
            'approved': 'Одобрено',
            'rejected': 'Отклонено',
            'in_progress': 'В работе',
            'completed': 'Реализовано'
        };
        return statuses[status] || status;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'недавно';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Если сегодня
        if (date.toDateString() === now.toDateString()) {
            return `сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Если вчера
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `вчера в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Если в этом году
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Старые даты
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(text, type = 'info') {
        // Удаляем старые сообщения
        const existing = document.querySelectorAll('.app-message');
        existing.forEach(msg => msg.remove());
        
        // Создаем новое сообщение
        const message = document.createElement('div');
        message.className = `app-message message-${type}`;
        message.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${text}</span>
                <button class="message-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(message);
        
        // Автоматическое скрытие
        if (type !== 'error') {
            setTimeout(() => {
                if (message.parentElement) message.remove();
            }, 4000);
        }
    }

    showError(text) {
        this.showMessage(text, 'error');
    }
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Документ загружен');
    
    // Ждем инициализации Firebase
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            window.app = new FirebaseCrowdsourcingApp();
        } else {
            console.error('Firebase не инициализирован');
            document.getElementById('authPanel').innerHTML = `
                <div class="error-container">
                    <h2><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</h2>
                    <p>Пожалуйста, проверьте подключение к интернету</p>
                </div>
            `;
        }
    }, 1000);
});
