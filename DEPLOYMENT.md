# iPhoneデモ用デプロイ手順書

**目的**: 明日のデモでiPhoneからアプリにアクセスできるようにする

---

## 🚀 方法1: GitHub Pages（推奨・最も簡単）

### 手順

1. **GitHubリポジトリを作成**
   ```bash
   cd senior-voice-chat
   git init
   git add .
   git commit -m "Initial commit: Senior Voice Chat App"
   ```

2. **GitHubにプッシュ**
   - GitHubで新しいリポジトリを作成（例: `senior-voice-chat`）
   - 以下のコマンドを実行：
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/senior-voice-chat.git
   git branch -M main
   git push -u origin main
   ```

3. **GitHub Pagesを有効化**
   - GitHubリポジトリの **Settings** → **Pages**
   - **Source**: `main` ブランチを選択
   - **Folder**: `/ (root)` を選択
   - **Save** をクリック

4. **アクセスURL**
   - 数分後に以下のURLでアクセス可能：
   ```
   https://YOUR_USERNAME.github.io/senior-voice-chat/
   ```

5. **iPhoneでアクセス**
   - Safariで上記URLを開く
   - ホーム画面に追加（共有ボタン → ホーム画面に追加）

---

## 📱 方法2: ローカルネットワーク（即座に利用可能）

### 前提条件
- PCとiPhoneが**同じWi-Fiネットワーク**に接続されていること

### 手順

1. **ローカルサーバーを起動**
   ```bash
   cd senior-voice-chat
   npx serve -p 3000 --cors
   ```
   （既に起動している場合はスキップ）

2. **PCのIPアドレスを確認**
   - Windows: `ipconfig` コマンドで確認
   - 通常は `192.168.x.x` の形式

3. **iPhoneでアクセス**
   - Safariで以下のURLを開く：
   ```
   http://192.168.1.82:3000
   ```
   （IPアドレスは環境により異なります）

4. **注意事項**
   - PCのファイアウォールでポート3000を許可する必要がある場合があります
   - 同じWi-Fiネットワークに接続されている必要があります

---

## 🌐 方法3: Vercel（無料・高速）

### 手順

1. **Vercelアカウント作成**
   - [vercel.com](https://vercel.com) にアクセス
   - GitHubアカウントでログイン

2. **プロジェクトをインポート**
   - 「New Project」をクリック
   - GitHubリポジトリを選択
   - 「Import」をクリック

3. **デプロイ設定**
   - **Framework Preset**: Other
   - **Root Directory**: `senior-voice-chat`
   - 「Deploy」をクリック

4. **アクセスURL**
   - デプロイ完了後、自動的にURLが生成されます：
   ```
   https://senior-voice-chat.vercel.app
   ```

---

## ✅ デモ前チェックリスト

### 必須確認事項

- [ ] **APIキーの設定**
  - アプリの「⚙️ 設定」からOpenAI APIキーを入力
  - APIキーが正しく動作するか確認

- [ ] **マイク権限**
  - iPhoneの設定 → Safari → マイク → 許可
  - または、アプリ使用時に許可を求められたら「許可」

- [ ] **インターネット接続**
  - Wi-Fiまたはモバイルデータが接続されていること
  - OpenAI APIへの接続が可能であること

- [ ] **動作確認**
  - 「🎤 話しかける」ボタンが動作するか
  - 音声認識が動作するか
  - AI応答が返ってくるか
  - 音声合成が動作するか

### デモシナリオ

1. **ホーム画面の紹介**
   - 「こちらがアプリのホーム画面です」
   - 「大きなボタンで操作が簡単です」

2. **ワンタッチ起動**
   - 「このボタンを押すだけで、すぐに会話が始まります」
   - 「話しかける」ボタンをタップ

3. **音声入力デモ**
   - 「今日はいい天気ですね」と話す
   - 文字起こしが表示されることを確認

4. **AI応答の可視化**
   - 「AIの返答が文字でも表示されるので、聞き取れなくても安心です」

5. **カテゴリー選択**
   - 「健康についてなど、話題も選べます」
   - カテゴリーボタンをタップ

6. **会話履歴**
   - 「過去の会話も読み返せます」
   - 履歴画面を表示

---

## 🔧 トラブルシューティング

### 問題: iPhoneからアクセスできない

**解決策**:
- PCとiPhoneが同じWi-Fiネットワークに接続されているか確認
- PCのファイアウォール設定を確認
- `http://` ではなく `https://` を使用（GitHub Pages/Vercelの場合）

### 問題: マイクが動作しない

**解決策**:
- iPhone設定 → Safari → マイク → 許可
- ページを再読み込み
- Safariでアクセスしているか確認（Chrome等では動作しない場合あり）

### 問題: APIキーエラー

**解決策**:
- APIキーが正しく入力されているか確認
- OpenAI PlatformでAPIキーが有効か確認
- クレジット残高を確認

### 問題: 音声認識が動作しない

**解決策**:
- Safariでアクセスしているか確認（Chrome等ではWeb Speech APIが動作しない場合あり）
- HTTPS接続を使用（GitHub Pages/Vercelは自動的にHTTPS）
- マイク権限が許可されているか確認

---

## 📝 推奨デプロイ方法

**明日のデモには GitHub Pages を推奨**

理由:
- ✅ 無料で利用可能
- ✅ HTTPS対応（音声認識に必要）
- ✅ 簡単にデプロイ可能
- ✅ URLが固定で共有しやすい
- ✅ iPhoneから直接アクセス可能

---

## 🎯 デモ当日の準備

1. **前日にデプロイ完了**
   - GitHub PagesまたはVercelにデプロイ
   - URLを確認・メモ

2. **APIキーの確認**
   - OpenAI APIキーが有効か確認
   - クレジット残高を確認

3. **動作確認**
   - iPhoneで実際に動作確認
   - マイク権限を許可
   - 会話が正常に動作するか確認

4. **バックアッププラン**
   - ローカルネットワークでのアクセス方法も準備
   - デモ用のスクリーンショットを用意

---

## 📱 iPhoneショートカット作成

デプロイ後、iPhoneでショートカットを作成：

1. Safariでアプリを開く
2. 共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」を選択
4. 名前を「AIおしゃべり」などに設定
5. 「追加」をタップ

これで、ホーム画面から直接アプリにアクセスできます。

