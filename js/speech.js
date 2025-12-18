/**
 * SpeechManager - 音声認識・合成管理クラス
 * Web Speech APIを使用した音声入出力を管理
 */
class SpeechManager {
    constructor() {
        // 音声認識の初期化
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.speechRate = 0.9;
        
        // コールバック
        this.onResult = null;
        this.onInterim = null;
        this.onEnd = null;
        this.onError = null;
        
        // 音声認識APIの確認と初期化
        this.initRecognition();
    }

    /**
     * 音声認識の初期化
     */
    initRecognition() {
        // ブラウザ互換性チェック
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('このブラウザは音声認識に対応していません');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ja-JP';
        this.recognition.continuous = false;      // 一文ずつ処理
        this.recognition.interimResults = true;   // リアルタイム表示
        this.recognition.maxAlternatives = 1;

        // イベントハンドラの設定
        this.recognition.onstart = () => {
            console.log('音声認識開始');
            this.isListening = true;
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // 中間結果のコールバック
            if (interimTranscript && this.onInterim) {
                this.onInterim(interimTranscript);
            }

            // 最終結果のコールバック
            if (finalTranscript && this.onResult) {
                this.onResult(finalTranscript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
            this.isListening = false;
            
            let errorMessage = '音声認識でエラーが発生しました';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = '音声が検出されませんでした。もう一度お話しください。';
                    break;
                case 'audio-capture':
                    errorMessage = 'マイクが見つかりません。マイクを確認してください。';
                    break;
                case 'not-allowed':
                    errorMessage = 'マイクの使用が許可されていません。設定を確認してください。';
                    break;
                case 'network':
                    errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                    break;
                case 'aborted':
                    // ユーザーによる中断は無視
                    return;
            }
            
            if (this.onError) {
                this.onError(errorMessage);
            }
        };

        this.recognition.onend = () => {
            console.log('音声認識終了');
            this.isListening = false;
            if (this.onEnd) {
                this.onEnd();
            }
        };
    }

    /**
     * 音声認識を開始
     * @param {Function} onResult - 最終結果のコールバック
     * @param {Function} onInterim - 中間結果のコールバック
     * @param {Function} onEnd - 終了時のコールバック
     * @param {Function} onError - エラー時のコールバック
     */
    startListening(onResult, onInterim, onEnd, onError) {
        if (!this.recognition) {
            if (onError) {
                onError('音声認識が利用できません');
            }
            return false;
        }

        // 読み上げ中なら停止
        if (this.isSpeaking) {
            this.stopSpeaking();
        }

        this.onResult = onResult;
        this.onInterim = onInterim;
        this.onEnd = onEnd;
        this.onError = onError;

        try {
            this.recognition.start();
            return true;
        } catch (e) {
            console.error('音声認識開始エラー:', e);
            if (onError) {
                onError('音声認識を開始できませんでした');
            }
            return false;
        }
    }

    /**
     * 音声認識を停止
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.error('音声認識停止エラー:', e);
            }
        }
        this.isListening = false;
    }

    /**
     * テキストを音声で読み上げ
     * @param {string} text - 読み上げるテキスト
     * @param {Function} onEnd - 読み上げ完了時のコールバック
     * @returns {boolean} 成功かどうか
     */
    speak(text, onEnd) {
        if (!this.synthesis) {
            console.error('音声合成が利用できません');
            if (onEnd) onEnd();
            return false;
        }

        // 既存の読み上げをキャンセル
        this.stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = this.speechRate;  // 少しゆっくり
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // 日本語音声を優先的に選択
        const voices = this.synthesis.getVoices();
        const japaneseVoice = voices.find(voice => 
            voice.lang.startsWith('ja') && voice.localService
        ) || voices.find(voice => 
            voice.lang.startsWith('ja')
        );
        
        if (japaneseVoice) {
            utterance.voice = japaneseVoice;
        }

        utterance.onstart = () => {
            console.log('音声合成開始');
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            console.log('音声合成終了');
            this.isSpeaking = false;
            if (onEnd) onEnd();
        };

        utterance.onerror = (event) => {
            console.error('音声合成エラー:', event.error);
            this.isSpeaking = false;
            if (onEnd) onEnd();
        };

        this.synthesis.speak(utterance);
        return true;
    }

    /**
     * 読み上げを停止
     */
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }

    /**
     * 読み上げ速度を設定
     * @param {number} rate - 速度 (0.5-2.0)
     */
    setSpeechRate(rate) {
        this.speechRate = Math.max(0.5, Math.min(2.0, rate));
    }

    /**
     * 音声認識がサポートされているか確認
     * @returns {boolean} サポート状況
     */
    isRecognitionSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    /**
     * 音声合成がサポートされているか確認
     * @returns {boolean} サポート状況
     */
    isSynthesisSupported() {
        return !!window.speechSynthesis;
    }

    /**
     * マイク権限を確認・要求
     * @returns {Promise<boolean>} 権限が許可されたかどうか
     */
    async checkMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 権限取得後、ストリームを解放
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('マイク権限エラー:', error);
            return false;
        }
    }

    /**
     * 利用可能な音声一覧を取得
     * @returns {Array} 音声オブジェクトの配列
     */
    getAvailableVoices() {
        if (!this.synthesis) return [];
        return this.synthesis.getVoices().filter(voice => voice.lang.startsWith('ja'));
    }
}

// グローバルインスタンス
window.speechManager = new SpeechManager();

