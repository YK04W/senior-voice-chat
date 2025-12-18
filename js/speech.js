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
        this.useOpenAITTS = false;  // iPhone対応のためWeb Speech APIを使用（デフォルト）
        this.ttsVoice = 'nova';     // デフォルト音声（明るい女性の声）
        this.ttsModel = 'tts-1';    // 標準モデル（低遅延）
        
        // 音声再生用
        this.currentAudio = null;
        this.audioContext = null;
        this.isAudioContextInitialized = false;
        
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
        this.recognition.continuous = false;      // 一発で認識
        this.recognition.interimResults = true;   // リアルタイム表示
        this.recognition.maxAlternatives = 1;

        // イベントハンドラの設定
        this.recognition.onstart = () => {
            console.log('音声認識開始');
            this.isListening = true;
        };

        this.recognition.onresult = (event) => {
            console.log('音声認識イベント:', event);
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const isFinal = event.results[i].isFinal;
                console.log(`結果[${i}]:`, transcript, 'isFinal:', isFinal);
                
                if (isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            console.log('中間結果:', interimTranscript);
            console.log('最終結果:', finalTranscript);

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
     * AudioContextを初期化（iOS対応）
     */
    async initAudioContext() {
        if (this.isAudioContextInitialized && this.audioContext) return;
        
        try {
            // AudioContextの初期化（iOS対応）
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext && !this.audioContext) {
                this.audioContext = new AudioContext();
                console.log('AudioContext作成:', this.audioContext.state);
                
                // サイレント音声を再生してコンテキストをアンロック（iOS対応）
                const buffer = this.audioContext.createBuffer(1, 1, 22050);
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.audioContext.destination);
                source.start(0);
                
                // AudioContextをresumeする（iOS対応）
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                    console.log('AudioContext resumed:', this.audioContext.state);
                }
                
                this.isAudioContextInitialized = true;
                console.log('AudioContext初期化完了（iOS対応）');
            }
        } catch (error) {
            console.error('AudioContext初期化エラー:', error);
        }
    }

    /**
     * テキストを音声で読み上げ
     * @param {string} text - 読み上げるテキスト
     * @param {Function} onEnd - 読み上げ完了時のコールバック
     * @returns {Promise<boolean>} 成功かどうか
     */
    async speak(text, onEnd) {
        console.log('speak呼び出し:', { useOpenAITTS: this.useOpenAITTS, volumeGain: this.volumeGain });
        
        // AudioContextの初期化（iOS対応）
        await this.initAudioContext();
        
        // OpenAI TTSを使用する場合
        if (this.useOpenAITTS && window.aiClient && window.aiClient.apiKey) {
            try {
                // 既存の読み上げをキャンセル
                this.stopSpeaking();
                
                this.isSpeaking = true;
                console.log('OpenAI TTS開始:', text, '音量ゲイン:', this.volumeGain);

                // OpenAI TTS APIで音声を生成
                const audioBlob = await window.aiClient.textToSpeech(
                    text,
                    this.ttsVoice,
                    this.ttsModel
                );

                // AudioContextが初期化されているか確認
                if (!this.audioContext) {
                    console.error('AudioContextが初期化されていません');
                    return this.speakFallback(text, onEnd);
                }

                // Web Audio APIを使用して再生（iOS対応・音量調整可能）
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                
                // ゲインノードを作成して音量を増幅
                const gainNode = this.audioContext.createGain();
                const effectiveGain = this.volumeGain || 2.0;  // デフォルトは2.0
                gainNode.gain.value = effectiveGain;
                console.log('実際の音量ゲイン:', gainNode.gain.value);
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                source.onended = () => {
                    this.isSpeaking = false;
                    console.log('OpenAI TTS終了');
                    if (onEnd) onEnd();
                };
                
                source.start(0);
                console.log('OpenAI TTS再生開始（Web Audio API、音量:', effectiveGain, '倍）');
                return true;

            } catch (error) {
                console.error('OpenAI TTSエラー:', error);
                // エラー時はWeb Speech APIにフォールバック
                return this.speakFallback(text, onEnd);
            }
        }

        // Web Speech APIを使用（デフォルト）
        console.log('Web Speech APIを使用');
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

        // iPhone対応: 確実にキャンセル
        this.synthesis.cancel();
        
        // iPhone対応: 少し待ってから新しい音声を開始
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = this.speechRate;
            utterance.pitch = 1.0;
            // Web Speech APIは1.0が最大値なので、デバイス検出の意味がない
            utterance.volume = 1.0;  // 最大音量

            // 日本語音声を優先的に選択（より自然な音声を探す）
            const voices = this.synthesis.getVoices();
            console.log('利用可能な音声:', voices.map(v => `${v.name} (${v.lang})`));
            
            // より自然な日本語音声を優先的に選択
            const japaneseVoice = 
                voices.find(voice => voice.lang === 'ja-JP' && voice.name.includes('Kyoko')) ||
                voices.find(voice => voice.lang === 'ja-JP' && voice.name.includes('Otoya')) ||
                voices.find(voice => voice.lang === 'ja-JP' && !voice.localService) || // クラウド音声を優先
                voices.find(voice => voice.lang.startsWith('ja') && !voice.localService) ||
                voices.find(voice => voice.lang === 'ja-JP' && voice.localService) ||
                voices.find(voice => voice.lang.startsWith('ja'));
            
            if (japaneseVoice) {
                utterance.voice = japaneseVoice;
                console.log('使用する音声:', japaneseVoice.name, 'localService:', japaneseVoice.localService);
            } else {
                console.log('日本語音声が見つかりません。デフォルト音声を使用します。');
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

            // iPhone対応: speakの前にspeakingを確認
            if (this.synthesis.speaking) {
                console.warn('まだ音声が再生中です。キャンセルして再試行します。');
                this.synthesis.cancel();
                setTimeout(() => {
                    this.synthesis.speak(utterance);
                }, 100);
            } else {
                this.synthesis.speak(utterance);
            }
        }, 100); // iPhone対応: 少し待つ

        return true;
    }

    /**
     * 読み上げを停止
     */
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        // 再生中の音声を停止
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        this.isSpeaking = false;
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
     * デバイスを検出
     * @returns {string} 'ios', 'android', 'pc'
     */
    detectDevice() {
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            return 'ios';
        } else if (/android/.test(ua)) {
            return 'android';
        } else {
            return 'pc';
        }
    }

    /**
     * 音量ゲインを設定
     * @param {number} gain - 音量ゲイン（1.0 = 通常、2.0 = 2倍）
     */
    setVolumeGain(gain) {
        this.volumeGain = Math.max(0.5, Math.min(5.0, gain));
        console.log('音量ゲインを設定:', this.volumeGain);
    }

    /**
     * 現在の音量ゲインを取得
     * @returns {number} 音量ゲイン
     */
    getVolumeGain() {
        return this.volumeGain;
    }
}

// グローバルインスタンス
window.speechManager = new SpeechManager();
