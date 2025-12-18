# 🔒 セキュリティガイド

## ✅ 現在の実装は安全です

### APIキーの管理方法

現在のアプリでは、**APIキーはコードに含まれていません**。

- ✅ APIキーは各ユーザーのブラウザの**LocalStorage**に保存されます
- ✅ GitHubにプッシュしてもAPIキーは含まれません
- ✅ 各ユーザーが自分でAPIキーを設定します

### Publicリポジトリでも安全な理由

1. **APIキーはコードに含まれていない**
   - コード内にAPIキーをハードコードしていません
   - すべてのAPIキーはユーザーが設定画面で入力します

2. **LocalStorageに保存**
   - APIキーはブラウザのLocalStorageに保存されます
   - サーバーには送信されません
   - GitHubには含まれません

3. **各ユーザーが個別に設定**
   - デモでは、あなたが自分のAPIキーを設定します
   - 他のユーザーは各自のAPIキーを設定します

---

## ⚠️ 絶対にやってはいけないこと

### ❌ コードにAPIキーを直接書く

```javascript
// ❌ 絶対にやらない
const API_KEY = 'sk-xxxxxxxxxxxxx';
```

### ❌ 設定ファイルをコミットする

```bash
# ❌ 絶対にやらない
git add .env
git commit -m "Add API key"
```

### ❌ APIキーをREADMEに書く

```markdown
<!-- ❌ 絶対にやらない -->
APIキー: sk-xxxxxxxxxxxxx
```

---

## ✅ 正しい使い方

### デモでの使い方

1. **GitHubにプッシュ**
   ```bash
   git push origin main
   ```
   → APIキーは含まれていないので安全

2. **GitHub Pagesでデプロイ**
   - Settings → Pages で有効化
   - 公開URLが生成される

3. **iPhoneでアプリを開く**
   - Safariで公開URLにアクセス

4. **APIキーを設定**
   - アプリの「⚙️ 設定」を開く
   - 自分のOpenAI APIキーを入力
   - 「保存する」をタップ

5. **使用開始**
   - APIキーはあなたのiPhoneのLocalStorageに保存されます
   - 他のユーザーには見えません

---

## 🔐 APIキーの保護方法

### 1. APIキーの制限設定（推奨）

OpenAI PlatformでAPIキーに制限を設定：

1. [platform.openai.com](https://platform.openai.com) にログイン
2. **API keys** → 使用するキーを選択
3. **Permissions** で制限を設定：
   - 特定のIPアドレスのみ許可
   - 使用量の上限を設定
   - 不要になったら削除

### 2. 使用量の監視

- OpenAI Platformで使用量を定期的に確認
- 異常な使用量がないかチェック
- 必要に応じてAPIキーを無効化

### 3. デモ用APIキーの作成

- 本番用とは別にデモ専用のAPIキーを作成
- デモ後は無効化または削除
- 使用量の上限を設定

---

## 📋 デプロイ前チェックリスト

### コードの確認

- [ ] コード内にAPIキーが含まれていないか確認
- [ ] `.env`ファイルが`.gitignore`に含まれているか確認
- [ ] ハードコードされたAPIキーがないか検索

### 確認コマンド

```bash
# APIキーが含まれていないか確認
cd senior-voice-chat
grep -r "sk-" . --exclude-dir=.git
# 何も表示されなければOK
```

---

## 🚨 万が一APIキーが漏洩した場合

### 即座に実行すべきこと

1. **APIキーを無効化**
   - OpenAI Platform → API keys
   - 漏洩したキーを削除

2. **新しいAPIキーを作成**
   - 新しいAPIキーを生成
   - アプリで再設定

3. **使用量を確認**
   - 異常な使用がないか確認
   - 必要に応じてサポートに連絡

---

## ✅ 結論

**現在の実装は安全です。Publicリポジトリにプッシュしても問題ありません。**

- APIキーはコードに含まれていません
- 各ユーザーが自分で設定します
- LocalStorageに保存されるため、GitHubには含まれません

安心してGitHubにプッシュしてデプロイしてください！

