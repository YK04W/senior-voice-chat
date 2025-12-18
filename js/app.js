/**
 * VoiceChatApp - メインアプリケーションクラス
 * アプリ全体のロジックとUIを管理
 */
class VoiceChatApp {
    constructor() {
        // マネージャーのインスタンス
        this.speech = window.speechManager;
        this.ai = window.aiClient;
        this.storage = window.storageManager;
        
        // 状態管理
        this.currentScreen = 'home';
        this.currentConversation = null;
        this.currentCategory = 'general';
        this.isRecording = false;
        this.selectedHistoryId = null;
        
        // 初期化
        this.init();
    }

    /**
     * アプリの初期化
     */
    async init() {
        console.log('アプリを初期化中...');
        
        // 設定を読み込み
        this.loadSettings();
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // マイク権限を確認
        await this.checkMicrophonePermission();
        
        // 音声合成の初期化（iOSでは必要）
        this.initSpeechSynthesis();
        
        console.log('アプリ初期化完了');
    }

    /**
     * 設定を読み込み
     */
    loadSettings() {
        // APIキー
        const apiKey = this.storage.getApiKey();
        if (apiKey) {
            this.ai.setApiKey(apiKey);
        }
        
        // 音声速度
        const speechRate = this.storage.getSpeechRate();
        this.speech.setSpeechRate(speechRate);
        
        // OpenAI TTS設定
        const useOpenAITTS = this.storage.getUseOpenAITTS();
        this.speech.setUseOpenAITTS(useOpenAITTS);
        const ttsVoice = this.storage.getTTSVoice();
        this.speech.setTTSVoice(ttsVoice);
        const ttsModel = this.storage.getTTSModel();
        this.speech.setTTSModel(ttsModel);
        
        // フォントサイズ
        const fontSize = this.storage.getFontSize();
        this.applyFontSize(fontSize);
    }

    /**
     * フォントサイズを適用
     */
    applyFontSize(size) {
        document.body.classList.remove('size-medium', 'size-large', 'size-xlarge');
        document.body.classList.add(`size-${size}`);
        
        // ボタンの状態を更新
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
    }

    /**
     * 音声合成の初期化（iOS対応）
     */
    initSpeechSynthesis() {
        // iOSでは最初のユーザーインタラクション後に音声を読み込む必要がある
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            
            // Voicesが非同期で読み込まれる場合の対応
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // ホーム画面
        document.getElementById('start-chat').addEventListener('click', () => {
            this.startNewConversation('general');
        });

        document.getElementById('history-btn').addEventListener('click', () => {
            this.showHistoryScreen();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsScreen();
        });

        // カテゴリーボタン
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.startNewConversation(category);
            });
        });

        // 会話画面
        document.getElementById('back-btn').addEventListener('click', () => {
            this.endConversation();
        });

        document.getElementById('end-chat-btn').addEventListener('click', () => {
            this.endConversation();
        });

        document.getElementById('record-btn').addEventListener('click', () => {
            this.toggleRecording();
        });

        // 履歴画面
        document.getElementById('history-back-btn').addEventListener('click', () => {
            this.showHomeScreen();
        });

        // 履歴詳細画面
        document.getElementById('detail-back-btn').addEventListener('click', () => {
            this.showHistoryScreen();
        });

        document.getElementById('delete-conv-btn').addEventListener('click', () => {
            this.deleteCurrentConversation();
        });

        // 設定画面
        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.showHomeScreen();
        });

        document.getElementById('save-api-key').addEventListener('click', () => {
            this.saveApiKey();
        });

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSpeedOption(e.currentTarget);
            });
        });

        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSizeOption(e.currentTarget);
            });
        });

        document.getElementById('tts-voice-select').addEventListener('change', (e) => {
            this.setTTSVoice(e.target.value);
        });

        document.querySelectorAll('input[name="tts-model"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setTTSModel(e.target.value);
            });
        });

        document.getElementById('clear-all-data').addEventListener('click', () => {
            this.clearAllData();
        });

        // マイク権限モーダル
        document.getElementById('grant-permission').addEventListener('click', () => {
            this.requestMicrophonePermission();
        });
    }

    /**
     * マイク権限を確認
     */
    async checkMicrophonePermission() {
        // 音声認識がサポートされていない場合
        if (!this.speech.isRecognitionSupported()) {
            this.showError('このブラウザは音声認識に対応していません。Chrome または Safari をお使いください。');
            return;
        }

        // 権限確認（ブラウザが対応している場合）
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const result = await navigator.permissions.query({ name: 'microphone' });
                if (result.state === 'denied') {
                    this.showPermissionModal();
                }
            } catch (e) {
                // 対応していないブラウザは無視
            }
        }
    }

    /**
     * マイク権限モーダルを表示
     */
    showPermissionModal() {
        document.getElementById('permission-modal').classList.remove('hidden');
    }

    /**
     * マイク権限をリクエスト
     */
    async requestMicrophonePermission() {
        const granted = await this.speech.checkMicrophonePermission();
        document.getElementById('permission-modal').classList.add('hidden');
        
        if (!granted) {
            this.showError('マイクの使用を許可してください。設定アプリからマイクの権限を確認できます。');
        }
    }

    // ========================================
    // 画面遷移
    // ========================================

    /**
     * 画面を切り替え
     */
    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    /**
     * ホーム画面を表示
     */
    showHomeScreen() {
        this.switchScreen('home-screen');
    }

    /**
     * 会話画面を表示
     */
    showChatScreen() {
        this.switchScreen('chat-screen');
    }

    /**
     * 履歴画面を表示
     */
    showHistoryScreen() {
        this.renderHistoryList();
        this.switchScreen('history-screen');
    }

    /**
     * 履歴詳細画面を表示
     */
    showHistoryDetailScreen(conversationId) {
        this.selectedHistoryId = conversationId;
        this.renderHistoryDetail(conversationId);
        this.switchScreen('history-detail-screen');
    }

    /**
     * 設定画面を表示
     */
    showSettingsScreen() {
        // 現在のAPIキーを表示（マスク処理）
        const apiKey = this.storage.getApiKey();
        const input = document.getElementById('api-key-input');
        if (apiKey) {
            input.value = apiKey;
        }
        
        // 現在の速度設定を反映
        const speechRate = this.storage.getSpeechRate();
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speechRate);
        });
        
        // TTS音声タイプを反映
        const ttsVoice = this.storage.getTTSVoice();
        document.getElementById('tts-voice-select').value = ttsVoice;
        
        // TTSモデルを反映
        const ttsModel = this.storage.getTTSModel();
        document.querySelector(`input[name="tts-model"][value="${ttsModel}"]`).checked = true;
        
        this.switchScreen('settings-screen');
    }

    // ========================================
    // 会話機能
    // ========================================

    /**
     * 新しい会話を開始
     */
    async startNewConversation(category) {
        // APIキーの確認
        if (!this.storage.getApiKey()) {
            this.showError('まず設定画面でAPIキーを入力してください。');
            this.showSettingsScreen();
            return;
        }

        this.currentCategory = category;
        this.currentConversation = {
            id: `conv_${Date.now()}`,
            date: new Date().toISOString(),
            category: category,
            messages: []
        };

        // カテゴリー名を表示
        const categoryNames = {
            '天気': '☀️ 天気の話',
            '健康': '🏥 健康の話',
            '家族': '👨‍👩‍👧‍👦 家族の話',
            '趣味': '📺 趣味の話',
            'general': '💬 おしゃべり'
        };
        document.getElementById('current-category').textContent = categoryNames[category] || 'おしゃべり中';

        // チャット画面をクリア
        document.getElementById('chat-messages').innerHTML = '';
        
        // 会話画面を表示
        this.showChatScreen();

        // AI挨拶を追加
        await this.addAIGreeting();
    }

    /**
     * AI挨拶を追加
     */
    async addAIGreeting() {
        const greeting = this.ai.getGreeting(this.currentCategory);
        this.addMessage('assistant', greeting);
        
        // 音声で読み上げ（非同期）
        await this.speech.speak(greeting, null);
    }

    /**
     * 会話を終了
     */
    endConversation() {
        // 録音中なら停止
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // 読み上げ中なら停止
        this.speech.stopSpeaking();
        
        // 会話を保存（メッセージがある場合のみ）
        if (this.currentConversation && this.currentConversation.messages.length > 0) {
            this.storage.saveConversation(this.currentConversation);
        }
        
        this.currentConversation = null;
        this.showHomeScreen();
    }

    /**
     * 録音のトグル
     */
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    /**
     * 録音を開始
     */
    startRecording() {
        // 読み上げ中なら停止
        if (this.speech.isSpeaking) {
            this.speech.stopSpeaking();
        }

        const started = this.speech.startListening(
            // 最終結果
            (transcript) => {
                this.hideInterimTranscript();
                this.handleUserInput(transcript);
                this.stopRecording();
            },
            // 中間結果
            (interim) => {
                this.showInterimTranscript(interim);
            },
            // 終了
            () => {
                this.stopRecording();
            },
            // エラー
            (error) => {
                this.showError(error);
                this.stopRecording();
            }
        );

        if (started) {
            this.isRecording = true;
            this.updateRecordButton(true);
        }
    }

    /**
     * 録音を停止
     */
    stopRecording() {
        this.speech.stopListening();
        this.isRecording = false;
        this.updateRecordButton(false);
        this.hideInterimTranscript();
    }

    /**
     * 録音ボタンの状態を更新
     */
    updateRecordButton(isRecording) {
        const btn = document.getElementById('record-btn');
        const text = btn.querySelector('.record-text');
        
        if (isRecording) {
            btn.classList.add('recording');
            text.textContent = '🔴 録音中...タップで停止';
        } else {
            btn.classList.remove('recording');
            text.textContent = 'タップして話す';
        }
    }

    /**
     * 中間結果を表示
     */
    showInterimTranscript(text) {
        const container = document.getElementById('interim-display');
        const textEl = document.getElementById('interim-text');
        container.classList.remove('hidden');
        textEl.textContent = text;
    }

    /**
     * 中間結果を非表示
     */
    hideInterimTranscript() {
        const container = document.getElementById('interim-display');
        container.classList.add('hidden');
    }

    /**
     * ユーザー入力を処理
     */
    async handleUserInput(text) {
        if (!text.trim()) return;

        // ユーザーメッセージを追加
        this.addMessage('user', text);

        // ローディング表示
        this.showLoading();

        try {
            // AI応答を取得（ストリーミング対応）
            let fullResponse = '';
            let streamMessageId = null;

            const response = await this.ai.sendMessage(
                this.currentConversation.messages,
                this.currentCategory,
                // ストリーミングコールバック
                (chunk, accumulated) => {
                    fullResponse = accumulated;
                    
                    // 最初のチャンクでメッセージを作成
                    if (!streamMessageId) {
                        streamMessageId = this.addStreamingMessage('assistant', chunk);
                    } else {
                        // 既存メッセージを更新
                        this.updateStreamingMessage(streamMessageId, accumulated);
                    }
                }
            );

            this.hideLoading();

            // ストリーミングが完了したら最終メッセージを確定
            if (streamMessageId) {
                this.finalizeStreamingMessage(streamMessageId, fullResponse || response);
            } else {
                // ストリーミングが使われなかった場合（フォールバック）
                this.addMessage('assistant', response);
                fullResponse = response;
            }

            // 音声で読み上げ（非同期）
            await this.speech.speak(fullResponse || response, null);

        } catch (error) {
            this.hideLoading();
            console.error('AI応答エラー:', error);
            this.showError(error.message || '申し訳ございません。もう一度お話しください。');
        }
    }

    /**
     * メッセージを追加
     */
    addMessage(role, content) {
        const message = {
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        };

        this.currentConversation.messages.push(message);
        this.displayMessage(message);

        // 会話を保存
        this.storage.saveConversation(this.currentConversation);
    }

    /**
     * メッセージを画面に表示
     */
    displayMessage(message) {
        const chatContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.innerHTML = `
            <div class="bubble">
                <p>${this.escapeHtml(message.content)}</p>
            </div>
            <span class="timestamp">${this.formatTime(message.timestamp)}</span>
        `;
        chatContainer.appendChild(messageDiv);
        
        // 最新メッセージまでスクロール
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    /**
     * ストリーミングメッセージを追加
     * @param {string} role - メッセージの役割
     * @param {string} initialContent - 初期コンテンツ
     * @returns {string} メッセージID
     */
    addStreamingMessage(role, initialContent) {
        const chatContainer = document.getElementById('chat-messages');
        const messageId = `stream_${Date.now()}`;
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `
            <div class="bubble">
                <p>${this.escapeHtml(initialContent)}<span class="streaming-cursor">▋</span></p>
            </div>
            <span class="timestamp">${this.formatTime(new Date().toISOString())}</span>
        `;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return messageId;
    }

    /**
     * ストリーミングメッセージを更新
     * @param {string} messageId - メッセージID
     * @param {string} content - 更新コンテンツ
     */
    updateStreamingMessage(messageId, content) {
        const messageDiv = document.getElementById(messageId);
        if (messageDiv) {
            const bubble = messageDiv.querySelector('.bubble p');
            if (bubble) {
                bubble.innerHTML = `${this.escapeHtml(content)}<span class="streaming-cursor">▋</span>`;
            }
            
            // 最新メッセージまでスクロール
            const chatContainer = document.getElementById('chat-messages');
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    /**
     * ストリーミングメッセージを確定
     * @param {string} messageId - メッセージID
     * @param {string} finalContent - 最終コンテンツ
     */
    finalizeStreamingMessage(messageId, finalContent) {
        const messageDiv = document.getElementById(messageId);
        if (messageDiv) {
            const bubble = messageDiv.querySelector('.bubble p');
            if (bubble) {
                // カーソルを削除
                bubble.innerHTML = this.escapeHtml(finalContent);
            }
            
            // 会話履歴に保存
            if (this.currentConversation) {
                const message = {
                    role: 'assistant',
                    content: finalContent,
                    timestamp: new Date().toISOString()
                };
                this.currentConversation.messages.push(message);
                this.storage.saveConversation(this.currentConversation);
            }
        }
    }

    // ========================================
    // 履歴機能
    // ========================================

    /**
     * 履歴リストを描画
     */
    renderHistoryList() {
        const list = document.getElementById('history-list');
        const noHistory = document.getElementById('no-history');
        const conversations = this.storage.getConversationList();

        if (conversations.length === 0) {
            list.innerHTML = '';
            noHistory.classList.remove('hidden');
            return;
        }

        noHistory.classList.add('hidden');
        list.innerHTML = conversations.map(conv => {
            const preview = conv.messages.length > 0 
                ? conv.messages[0].content.substring(0, 30) + '...'
                : '会話なし';
            
            const categoryIcon = {
                '天気': '☀️',
                '健康': '🏥',
                '家族': '👨‍👩‍👧‍👦',
                '趣味': '📺',
                'general': '💬'
            };

            return `
                <div class="history-item" data-id="${conv.id}">
                    <div class="history-icon">${categoryIcon[conv.category] || '💬'}</div>
                    <div class="history-info">
                        <div class="history-date">${this.formatDate(conv.date)}</div>
                        <div class="history-preview">${this.escapeHtml(preview)}</div>
                    </div>
                    <div class="history-category">${conv.category || '自由会話'}</div>
                </div>
            `;
        }).join('');

        // クリックイベントを追加
        list.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showHistoryDetailScreen(item.dataset.id);
            });
        });
    }

    /**
     * 履歴詳細を描画
     */
    renderHistoryDetail(conversationId) {
        const conversation = this.storage.getConversation(conversationId);
        if (!conversation) return;

        // ヘッダーの日付を更新
        document.getElementById('detail-date').textContent = this.formatDate(conversation.date);

        // メッセージを表示
        const container = document.getElementById('detail-messages');
        container.innerHTML = conversation.messages.map(msg => `
            <div class="message ${msg.role}">
                <div class="bubble">
                    <p>${this.escapeHtml(msg.content)}</p>
                </div>
                <span class="timestamp">${this.formatTime(msg.timestamp)}</span>
            </div>
        `).join('');
    }

    /**
     * 現在の会話を削除
     */
    deleteCurrentConversation() {
        if (!this.selectedHistoryId) return;

        if (confirm('この会話を削除しますか？')) {
            this.storage.deleteConversation(this.selectedHistoryId);
            this.selectedHistoryId = null;
            this.showHistoryScreen();
            this.showToast('会話を削除しました');
        }
    }

    // ========================================
    // 設定機能
    // ========================================

    /**
     * APIキーを保存
     */
    async saveApiKey() {
        const input = document.getElementById('api-key-input');
        const apiKey = input.value.trim();

        if (!apiKey) {
            this.showError('APIキーを入力してください');
            return;
        }

        if (!this.ai.validateApiKeyFormat(apiKey)) {
            this.showError('APIキーの形式が正しくありません。sk-で始まるキーを入力してください。');
            return;
        }

        // 保存
        this.storage.saveApiKey(apiKey);
        this.ai.setApiKey(apiKey);
        this.showToast('APIキーを保存しました');
    }

    /**
     * 速度オプションを設定
     */
    setSpeedOption(btn) {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const rate = parseFloat(btn.dataset.speed);
        this.storage.saveSpeechRate(rate);
        this.speech.setSpeechRate(rate);
        this.showToast('音声速度を変更しました');
    }

    /**
     * サイズオプションを設定
     */
    setSizeOption(btn) {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const size = btn.dataset.size;
        this.storage.saveFontSize(size);
        this.applyFontSize(size);
        this.showToast('文字サイズを変更しました');
    }

    /**
     * TTS音声タイプを設定
     */
    setTTSVoice(voice) {
        this.storage.saveTTSVoice(voice);
        this.speech.setTTSVoice(voice);
        this.showToast('音声タイプを変更しました');
    }

    /**
     * TTSモデルを設定
     */
    setTTSModel(model) {
        this.storage.saveTTSModel(model);
        this.speech.setTTSModel(model);
        this.showToast('音声モデルを変更しました');
    }

    /**
     * 全データを削除
     */
    clearAllData() {
        if (confirm('全ての会話履歴を削除しますか？\nこの操作は取り消せません。')) {
            this.storage.clearAllConversations();
            this.showToast('全ての会話を削除しました');
        }
    }

    // ========================================
    // UI ユーティリティ
    // ========================================

    /**
     * ローディングを表示
     */
    showLoading() {
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    /**
     * ローディングを非表示
     */
    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    /**
     * エラーを表示
     */
    showError(message) {
        const toast = document.getElementById('error-toast');
        const messageEl = document.getElementById('error-message');
        messageEl.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    /**
     * トーストを表示
     */
    showToast(message) {
        const toast = document.getElementById('error-toast');
        const messageEl = document.getElementById('error-message');
        messageEl.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }

    /**
     * 時刻をフォーマット
     */
    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 日付をフォーマット
     */
    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceChatApp();
});

