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
        
        // OpenAI TTS設定
        this.useOpenAITTS = true;  // OpenAI TTSを使用（デフォルト）
        this.ttsVoice = 'nova';    // デフォルト音声（明るい女性の声）
        this.ttsModel = 'tts-1-hd'; // 高品質モデル
        
        // ストリーミングTTS用のキュー
        this.audioQueue = [];
        this.isPlayingQueue = false;
        this.streamingBuffer = '';
        this.streamingAudioContext = null;
        
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
     * @returns {Promise<boolean>} 成功かどうか
     */
    async speak(text, onEnd) {
        // OpenAI TTSを使用する場合
        if (this.useOpenAITTS && window.aiClient) {
            try {
                // 既存の読み上げをキャンセル
                this.stopSpeaking();
                
                this.isSpeaking = true;
                console.log('OpenAI TTS開始');

                // OpenAI TTS APIで音声を生成
                const audioBlob = await window.aiClient.textToSpeech(
                    text,
                    this.ttsVoice,
                    this.ttsModel
                );

                // 音声を再生
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    this.isSpeaking = false;
                    console.log('OpenAI TTS終了');
                    if (onEnd) onEnd();
                };

                audio.onerror = (error) => {
                    console.error('音声再生エラー:', error);
                    URL.revokeObjectURL(audioUrl);
                    this.isSpeaking = false;
                    // エラー時はフォールバック
                    this.speakFallback(text, onEnd);
                };

                await audio.play();
                return true;

            } catch (error) {
                console.error('OpenAI TTSエラー:', error);
                // エラー時はWeb Speech APIにフォールバック
                return this.speakFallback(text, onEnd);
            }
        }

        // Web Speech APIを使用（フォールバック）
        return this.speakFallback(text, onEnd);
    }

    /**
     * Web Speech APIを使用した読み上げ（フォールバック）
     * @param {string} text - 読み上げるテキスト
     * @param {Function} onEnd - 読み上げ完了時のコールバック
     * @returns {boolean} 成功かどうか
     */
    speakFallback(text, onEnd) {
        if (!this.synthesis) {
            console.error('音声合成が利用できません');
            if (onEnd) onEnd();
            return false;
        }

        // 既存の読み上げをキャンセル
        this.stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = this.speechRate;
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
            console.log('Web Speech API音声合成開始');
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            console.log('Web Speech API音声合成終了');
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
        
        // ストリーミングキューをクリア
        this.audioQueue = [];
        this.isPlayingQueue = false;
        this.streamingBuffer = '';
        
        // 再生中の音声を停止
        if (this.streamingAudioContext) {
            this.streamingAudioContext.pause();
            this.streamingAudioContext.currentTime = 0;
            this.streamingAudioContext = null;
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
     * OpenAI TTSの使用を有効/無効化
     * @param {boolean} enabled - 有効化するかどうか
     */
    setUseOpenAITTS(enabled) {
        this.useOpenAITTS = enabled;
    }

    /**
     * TTS音声タイプを設定
     * @param {string} voice - 音声タイプ ('nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer')
     */
    setTTSVoice(voice) {
        this.ttsVoice = voice;
    }

    /**
     * TTSモデルを設定
     * @param {string} model - モデル ('tts-1' または 'tts-1-hd')
     */
    setTTSModel(model) {
        this.ttsModel = model;
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

    /**
     * ストリーミングテキストを追加して音声を生成
     * ChatGPTアプリのような流暢な会話体験を実現
     * @param {string} chunk - 新しいテキストチャンク
     * @param {string} fullText - 累積テキスト
     * @param {Function} onEnd - 全再生完了時のコールバック
     */
    async addStreamingText(chunk, fullText, onEnd = null) {
        if (!this.useOpenAITTS || !window.aiClient) {
            return;
        }

        this.streamingBuffer = fullText;
        
        // 文の区切りを検出（句読点、改行）
        const lastSentenceEnd = this.findLastSentenceEnd(fullText);
        
        // 新しい文が完成した場合、音声を生成
        if (lastSentenceEnd > 0 && lastSentenceEnd < fullText.length) {
            const sentence = fullText.substring(0, lastSentenceEnd + 1).trim();
            const remaining = fullText.substring(lastSentenceEnd + 1);
            
            if (sentence.length > 0) {
                // 音声を生成してキューに追加
                await this.generateAndQueueAudio(sentence);
                // バッファを更新
                this.streamingBuffer = remaining;
            }
        }
        
        // ストリーミングが完了した場合、残りのテキストを処理
        if (onEnd && chunk === null) {
            if (this.streamingBuffer.trim().length > 0) {
                await this.generateAndQueueAudio(this.streamingBuffer.trim());
            }
            // キュー再生が完了するまで待つ
            await this.waitForQueueCompletion();
            if (onEnd) onEnd();
        }
    }

    /**
     * 最後の文の終わりを見つける
     * @param {string} text - テキスト
     * @returns {number} 最後の文の終わりの位置
     */
    findLastSentenceEnd(text) {
        const sentenceEndings = /[。！？\n]/g;
        let lastIndex = -1;
        let match;
        
        while ((match = sentenceEndings.exec(text)) !== null) {
            lastIndex = match.index;
        }
        
        return lastIndex;
    }

    /**
     * テキストから音声を生成してキューに追加
     * @param {string} text - 音声化するテキスト
     */
    async generateAndQueueAudio(text) {
        if (!text || text.trim().length === 0) return;
        
        try {
            this.isSpeaking = true;
            
            // OpenAI TTS APIで音声を生成
            const audioBlob = await window.aiClient.textToSpeech(
                text,
                this.ttsVoice,
                this.ttsModel
            );
            
            // キューに追加
            this.audioQueue.push({
                blob: audioBlob,
                text: text
            });
            
            // キュー再生を開始（まだ再生中でない場合）
            if (!this.isPlayingQueue) {
                this.playAudioQueue();
            }
            
        } catch (error) {
            console.error('音声生成エラー:', error);
            // エラー時はフォールバック
            this.speakFallback(text, null);
        }
    }

    /**
     * 音声キューを順次再生
     */
    async playAudioQueue() {
        if (this.isPlayingQueue || this.audioQueue.length === 0) {
            return;
        }
        
        this.isPlayingQueue = true;
        
        while (this.audioQueue.length > 0) {
            const item = this.audioQueue.shift();
            
            try {
                const audioUrl = URL.createObjectURL(item.blob);
                const audio = new Audio(audioUrl);
                
                // 再生完了を待つ
                await new Promise((resolve, reject) => {
                    audio.onended = () => {
                        URL.revokeObjectURL(audioUrl);
                        resolve();
                    };
                    
                    audio.onerror = (error) => {
                        URL.revokeObjectURL(audioUrl);
                        reject(error);
                    };
                    
                    audio.play().catch(reject);
                });
                
                // 次の音声までの短い間（自然な会話フロー）
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error('音声再生エラー:', error);
            }
        }
        
        this.isPlayingQueue = false;
        this.isSpeaking = false;
    }

    /**
     * キュー再生の完了を待つ
     */
    async waitForQueueCompletion() {
        while (this.isPlayingQueue || this.audioQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

// グローバルインスタンス
window.speechManager = new SpeechManager();

