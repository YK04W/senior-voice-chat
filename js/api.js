/**
 * AIClient - AI API連携クラス
 * OpenAI GPT-4o-mini との通信を管理
 */
class AIClient {
    constructor() {
        this.apiKey = '';
        this.endpoint = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4o-mini';
        this.maxTokens = 200;  // 短めの応答
        this.temperature = 0.8;  // 自然な会話
    }

    /**
     * APIキーを設定
     * @param {string} apiKey - OpenAI APIキー
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * カテゴリー別のシステムプロンプトを取得
     * @param {string} category - カテゴリー名
     * @returns {string} システムプロンプト
     */
    getSystemPrompt(category) {
        const basePrompt = `あなたは「おしゃべりパートナー」という名前の優しいAIアシスタントです。
高齢者の話し相手として、以下のルールで会話してください：

【基本ルール】
- 短い文章で、ゆっくり、親しみやすく話す
- 敬語を使いつつも、温かみのある言葉遣い
- 相手の話に共感し、寄り添う姿勢
- 1回の返答は2〜3文程度
- 質問を交えて会話を続ける

【注意点】
- 医療的なアドバイスは絶対にしない（「お医者さんに相談してくださいね」と伝える）
- ネガティブな話題でも否定せず、傾聴する
- 難しい言葉や専門用語は使わない
- 数字や日付は読みやすい形で伝える`;

        const categoryPrompts = {
            '天気': `${basePrompt}

【今回のテーマ：天気・季節】
天気や季節の話題を中心に会話します。
- 今日の天気や気温について話す
- 季節の行事や風物詩について触れる
- 昔の季節の思い出を引き出す`,

            '健康': `${basePrompt}

【今回のテーマ：健康】
健康に関する話題で会話します。
- 体調を気遣いながら話を聞く
- 具体的な医療アドバイスは絶対に避ける
- 「お医者さんに相談してくださいね」と促す
- 健康的な生活習慣の話題は歓迎`,

            '家族': `${basePrompt}

【今回のテーマ：家族】
家族に関する話題で会話します。
- 家族構成やお孫さんの話を温かく聞く
- 良い思い出を引き出す質問をする
- 寂しさを感じている場合は優しく寄り添う`,

            '趣味': `${basePrompt}

【今回のテーマ：趣味】
趣味や好きなことについて会話します。
- どんな趣味にも興味を示す
- 具体的なエピソードを聞く
- 新しい趣味の提案も軽くする`,

            'general': `${basePrompt}

【今回のテーマ：自由会話】
特定のテーマなく、自由に会話します。
- 相手の話したいことを引き出す
- 様々な話題に柔軟に対応
- 会話を楽しむ雰囲気を大切に`
        };

        return categoryPrompts[category] || categoryPrompts['general'];
    }

    /**
     * メッセージを送信してAI応答を取得
     * @param {Array} messages - 会話履歴
     * @param {string} category - カテゴリー
     * @param {Function} onStream - ストリーミング時のコールバック（オプション）
     * @returns {Promise<string>} AI応答
     */
    async sendMessage(messages, category = 'general', onStream = null) {
        console.log('sendMessage呼び出し:', { category, messagesCount: messages.length, hasStream: !!onStream });
        
        if (!this.apiKey) {
            throw new Error('APIキーが設定されていません。設定画面からAPIキーを入力してください。');
        }

        const systemPrompt = this.getSystemPrompt(category);
        
        // API用のメッセージ形式に変換
        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        console.log('APIリクエスト準備:', { model: this.model, messagesCount: apiMessages.length });

        // ストリーミング対応のパラメータ
        const requestBody = {
            model: this.model,
            messages: apiMessages,
            max_tokens: this.maxTokens,
            temperature: this.temperature
        };

        // ストリーミングが有効な場合
        if (onStream) {
            requestBody.stream = true;
            console.log('ストリーミングモード有効');
        }

        try {
            console.log('APIリクエスト送信...');
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey.substring(0, 7)}...`
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('APIレスポンス受信:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                if (response.status === 401) {
                    throw new Error('APIキーが正しくありません。設定を確認してください。');
                } else if (response.status === 429) {
                    throw new Error('APIの利用制限に達しました。しばらく待ってからお試しください。');
                } else if (response.status === 500) {
                    throw new Error('AIサービスに問題が発生しています。しばらく待ってからお試しください。');
                } else {
                    throw new Error(`APIエラー: ${errorData.error?.message || response.statusText}`);
                }
            }

            // ストリーミング処理
            if (onStream) {
                return await this.handleStreamingResponse(response, onStream);
            }

            // 通常のレスポンス処理
            const data = await response.json();
            
            if (!data.choices || data.choices.length === 0) {
                throw new Error('AIからの応答がありませんでした。');
            }

            return data.choices[0].message.content;

        } catch (error) {
            console.error('API通信エラー:', error);
            
            // ネットワークエラーの場合
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('インターネット接続を確認してください。');
            }
            
            throw error;
        }
    }

    /**
     * ストリーミングレスポンスを処理
     * @param {Response} response - fetchレスポンス
     * @param {Function} onStream - ストリーミングデータのコールバック
     * @returns {Promise<string>} 完全な応答テキスト
     */
    async handleStreamingResponse(response, onStream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 最後の不完全な行を保持

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            return fullText;
                        }

                        try {
                            const json = JSON.parse(data);
                            const content = json.choices?.[0]?.delta?.content;
                            
                            if (content) {
                                fullText += content;
                                if (onStream) {
                                    onStream(content, fullText);
                                }
                            }
                        } catch (e) {
                            // JSON解析エラーは無視
                        }
                    }
                }
            }

            return fullText;
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * 初回挨拶を生成
     * @param {string} category - カテゴリー
     * @returns {string} 挨拶文
     */
    getGreeting(category) {
        const greetings = {
            '天気': 'こんにちは！今日のお天気はいかがですか？お散歩日和でしょうか？',
            '健康': 'こんにちは！今日のお体の調子はいかがですか？',
            '家族': 'こんにちは！ご家族のお話、ぜひ聞かせてくださいね。',
            '趣味': 'こんにちは！何か楽しいご趣味はありますか？',
            'general': 'こんにちは！今日はどんなお話をしましょうか？なんでも聞かせてくださいね。'
        };

        return greetings[category] || greetings['general'];
    }

    /**
     * APIキーの簡易チェック
     * @param {string} apiKey - チェックするAPIキー
     * @returns {boolean} 形式が正しいかどうか
     */
    validateApiKeyFormat(apiKey) {
        // OpenAI APIキーの形式チェック（sk-で始まる）
        return apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;
    }

    /**
     * APIキーの接続テスト
     * @param {string} apiKey - テストするAPIキー
     * @returns {Promise<boolean>} 接続成功かどうか
     */
    async testApiKey(apiKey) {
        const originalKey = this.apiKey;
        this.apiKey = apiKey;

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'user', content: 'テスト' }
                    ],
                    max_tokens: 5
                })
            });

            this.apiKey = originalKey;
            return response.ok;

        } catch (error) {
            this.apiKey = originalKey;
            return false;
        }
    }

    /**
     * テキストを音声に変換（TTS API）
     * @param {string} text - 読み上げるテキスト
     * @param {string} voice - 音声タイプ ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')
     * @param {string} model - モデル ('tts-1' または 'tts-1-hd')
     * @returns {Promise<Blob>} 音声データ
     */
    async textToSpeech(text, voice = 'nova', model = 'tts-1-hd') {
        if (!this.apiKey) {
            throw new Error('APIキーが設定されていません');
        }

        try {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    input: text,
                    voice: voice,
                    speed: 1.0  // 速度（0.25-4.0）
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`TTS APIエラー: ${errorData.error?.message || response.statusText}`);
            }

            return await response.blob();

        } catch (error) {
            console.error('TTS API通信エラー:', error);
            throw error;
        }
    }

    /**
     * 利用可能な音声タイプ
     * @returns {Array} 音声タイプの配列
     */
    getAvailableVoices() {
        return [
            { id: 'nova', name: 'Nova（女性・明るい）', description: '明るく親しみやすい女性の声' },
            { id: 'alloy', name: 'Alloy（中性）', description: 'バランスの取れた中性の声' },
            { id: 'echo', name: 'Echo（男性）', description: '落ち着いた男性の声' },
            { id: 'fable', name: 'Fable（男性・温かい）', description: '温かみのある男性の声' },
            { id: 'onyx', name: 'Onyx（男性・深い）', description: '深みのある男性の声' },
            { id: 'shimmer', name: 'Shimmer（女性・優しい）', description: '優しく柔らかい女性の声' }
        ];
    }
}

// グローバルインスタンス
window.aiClient = new AIClient();

