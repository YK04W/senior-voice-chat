/**
 * StorageManager - LocalStorage管理クラス
 * 会話履歴の保存・読み込み・削除を管理
 */
class StorageManager {
    constructor() {
        this.storageKey = 'seniorVoiceChat_conversations';
        this.settingsKey = 'seniorVoiceChat_settings';
    }

    // ========================================
    // 会話データ管理
    // ========================================

    /**
     * 新しい会話を保存
     * @param {Object} conversation - 会話オブジェクト
     */
    saveConversation(conversation) {
        const data = this.getAllConversations();
        
        // 既存の会話を探す
        const existingIndex = data.conversations.findIndex(c => c.id === conversation.id);
        
        if (existingIndex >= 0) {
            // 既存の会話を更新
            data.conversations[existingIndex] = conversation;
        } else {
            // 新しい会話を追加
            data.conversations.push(conversation);
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    /**
     * 全ての会話を取得
     * @returns {Object} 会話データ
     */
    getAllConversations() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('会話データの解析エラー:', e);
                return { conversations: [] };
            }
        }
        return { conversations: [] };
    }

    /**
     * 特定の会話を取得
     * @param {string} id - 会話ID
     * @returns {Object|null} 会話オブジェクト
     */
    getConversation(id) {
        const data = this.getAllConversations();
        return data.conversations.find(conv => conv.id === id) || null;
    }

    /**
     * 会話を削除
     * @param {string} id - 会話ID
     */
    deleteConversation(id) {
        const data = this.getAllConversations();
        data.conversations = data.conversations.filter(conv => conv.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    /**
     * 全ての会話を削除
     */
    clearAllConversations() {
        localStorage.setItem(this.storageKey, JSON.stringify({ conversations: [] }));
    }

    /**
     * 会話リストを日付降順で取得
     * @returns {Array} ソートされた会話リスト
     */
    getConversationList() {
        const data = this.getAllConversations();
        return data.conversations.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
    }

    // ========================================
    // 設定管理
    // ========================================

    /**
     * 設定を保存
     * @param {Object} settings - 設定オブジェクト
     */
    saveSettings(settings) {
        try {
            const currentSettings = this.getSettings();
            const newSettings = { ...currentSettings, ...settings };
            const jsonString = JSON.stringify(newSettings);
            localStorage.setItem(this.settingsKey, jsonString);
            console.log('設定を保存しました:', this.settingsKey, Object.keys(newSettings));
            
            // 保存確認
            const saved = localStorage.getItem(this.settingsKey);
            if (!saved) {
                throw new Error('LocalStorageへの保存に失敗しました');
            }
        } catch (error) {
            console.error('設定保存エラー:', error);
            throw error;
        }
    }

    /**
     * 設定を取得
     * @returns {Object} 設定オブジェクト
     */
    getSettings() {
        const stored = localStorage.getItem(this.settingsKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('設定の解析エラー:', e);
            }
        }
        // デフォルト設定
        return {
            apiKey: '',
            speechRate: 0.9,
            fontSize: 'large',
            useOpenAITTS: true,  // OpenAI TTSを使用（デフォルト）
            ttsVoice: 'nova',    // デフォルト音声
            ttsModel: 'tts-1-hd' // 高品質モデル
        };
    }

    /**
     * APIキーを保存
     * @param {string} apiKey - APIキー
     */
    saveApiKey(apiKey) {
        this.saveSettings({ apiKey });
    }

    /**
     * APIキーを取得
     * @returns {string} APIキー
     */
    getApiKey() {
        return this.getSettings().apiKey || '';
    }

    /**
     * 音声速度を保存
     * @param {number} rate - 音声速度 (0.5-2.0)
     */
    saveSpeechRate(rate) {
        this.saveSettings({ speechRate: rate });
    }

    /**
     * 音声速度を取得
     * @returns {number} 音声速度
     */
    getSpeechRate() {
        return this.getSettings().speechRate || 0.9;
    }

    /**
     * フォントサイズを保存
     * @param {string} size - サイズ ('medium', 'large', 'xlarge')
     */
    saveFontSize(size) {
        this.saveSettings({ fontSize: size });
    }

    /**
     * フォントサイズを取得
     * @returns {string} フォントサイズ
     */
    getFontSize() {
        return this.getSettings().fontSize || 'large';
    }

    /**
     * OpenAI TTS使用設定を保存
     * @param {boolean} enabled - 有効化するかどうか
     */
    saveUseOpenAITTS(enabled) {
        this.saveSettings({ useOpenAITTS: enabled });
    }

    /**
     * OpenAI TTS使用設定を取得
     * @returns {boolean} 有効化されているかどうか
     */
    getUseOpenAITTS() {
        return this.getSettings().useOpenAITTS !== false; // デフォルトはtrue
    }

    /**
     * TTS音声タイプを保存
     * @param {string} voice - 音声タイプ
     */
    saveTTSVoice(voice) {
        this.saveSettings({ ttsVoice: voice });
    }

    /**
     * TTS音声タイプを取得
     * @returns {string} 音声タイプ
     */
    getTTSVoice() {
        return this.getSettings().ttsVoice || 'nova';
    }

    /**
     * TTSモデルを保存
     * @param {string} model - モデル ('tts-1' または 'tts-1-hd')
     */
    saveTTSModel(model) {
        this.saveSettings({ ttsModel: model });
    }

    /**
     * TTSモデルを取得
     * @returns {string} モデル
     */
    getTTSModel() {
        return this.getSettings().ttsModel || 'tts-1-hd';
    }

    // ========================================
    // ユーティリティ
    // ========================================

    /**
     * ストレージの使用量を取得（概算）
     * @returns {string} 使用量の文字列
     */
    getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length * 2; // UTF-16
            }
        }
        const kb = (total / 1024).toFixed(2);
        return `${kb} KB`;
    }

    /**
     * 全データをエクスポート
     * @returns {string} JSON文字列
     */
    exportData() {
        return JSON.stringify({
            conversations: this.getAllConversations(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    /**
     * データをインポート
     * @param {string} jsonString - インポートするJSON文字列
     * @returns {boolean} 成功かどうか
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.conversations) {
                localStorage.setItem(this.storageKey, JSON.stringify(data.conversations));
            }
            if (data.settings) {
                localStorage.setItem(this.settingsKey, JSON.stringify(data.settings));
            }
            return true;
        } catch (e) {
            console.error('インポートエラー:', e);
            return false;
        }
    }
}

// グローバルインスタンス
window.storageManager = new StorageManager();

