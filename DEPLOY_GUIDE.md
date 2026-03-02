# Melody Trace デプロイガイド

## 現在の状態
- Git リポジトリ初期化済み（3コミット）
- Capacitor 6.x セットアップ済み
- AdMob 統合済み（テスト広告ID）
- Android プラットフォーム追加済み（デバッグビルド成功）
- アプリアイコン・プライバシーポリシー作成済み

---

## Step 1: GitHub 認証 & リポジトリ作成（Windows）

```bash
# GitHub CLI にログイン
gh auth login -p https -h github.com --web

# プライベートリポジトリを作成して push
gh repo create melody-trace --private --source=. --remote=origin --push
```

もし `gh` での認証がうまくいかない場合:
1. https://github.com/new でリポジトリ「melody-trace」を手動作成（Private）
2. 以下を実行:
```bash
git remote add origin https://github.com/kerofen/melody-trace.git
git push -u origin main
```

---

## Step 2: iOS セットアップ（Mac）

### 2-1. リポジトリをクローン
```bash
git clone https://github.com/kerofen/melody-trace.git
cd melody-trace
npm install
```

### 2-2. iOS プラットフォーム追加
```bash
npm install @capacitor/ios@6
npm run build
npx cap add ios
npx cap sync ios
```

### 2-3. iOS の AdMob 設定
`ios/App/App/Info.plist` に以下を追加:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-xxxxxxxxxxxxx~yyyyyyyyyy</string>
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
</array>
```
※ `ca-app-pub-xxxxxxxxxxxxx~yyyyyyyyyy` は AdMob で作成した iOS アプリの App ID に差し替え

### 2-4. Xcode で開く
```bash
npx cap open ios
```

Xcode で以下を設定:
1. **Signing & Capabilities** → Team を選択、Bundle ID が `com.kerofen.melodytrace` であることを確認
2. **General** → Display Name を「Melody Trace」に設定
3. **General** → Version を 1.0.0、Build を 1 に設定
4. 実機を接続してビルド・テスト

### 2-5. App Store 審査提出
1. Xcode → Product → Archive
2. Organizer → Distribute App → App Store Connect
3. App Store Connect (https://appstoreconnect.apple.com) でアプリ情報入力:
   - スクリーンショット
   - アプリの説明文
   - プライバシーポリシー URL
   - 年齢レーティング
4. 審査に提出

### 2-6. GitHub に push
```bash
git add -A
git commit -m "Add iOS platform with AdMob and signing config"
git push
```

---

## Step 3: Android リリースビルド（Windows）

### 3-1. GitHub から最新を pull
```bash
git pull
```

### 3-2. AdMob App ID を本番用に変更
`android/app/src/main/AndroidManifest.xml` の以下を変更:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="あなたの本番AdMob App ID"/>
```

`src/managers/AdManager.js` の広告ユニット ID も本番用に変更:
```javascript
const AD_UNIT_IDS = {
    ios: {
        interstitial: 'あなたのiOS広告ユニットID',
    },
    android: {
        interstitial: 'あなたのAndroid広告ユニットID',
    },
};
```

`initializeForTesting` と `isTesting` を `false` に変更。

### 3-3. 署名用キーストア生成
```bash
keytool -genkey -v -keystore melody-trace-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias melody-trace
```
※ パスワードは安全に保管すること。キーストアファイルは Git にコミットしない。

### 3-4. リリースビルド
Android Studio でプロジェクトを開く:
```bash
npx cap open android
```

1. Build → Generate Signed Bundle / APK
2. Android App Bundle (AAB) を選択
3. キーストア情報を入力
4. Release ビルドを生成

### 3-5. Google Play Console で公開
1. https://play.google.com/console にアクセス
2. アプリを作成（com.kerofen.melodytrace）
3. AAB ファイルをアップロード
4. ストア掲載情報を入力:
   - アプリ名: Melody Trace
   - 説明文
   - スクリーンショット
   - フィーチャーグラフィック (1024x500)
   - プライバシーポリシー URL
   - コンテンツのレーティング
5. 審査に提出

### 3-6. GitHub に push
```bash
git add -A
git commit -m "Configure Android for release with AdMob production IDs"
git push
```

---

## AdMob セットアップ手順

1. https://admob.google.com にアクセス
2. アプリを追加:
   - 「Melody Trace」iOS 版
   - 「Melody Trace」Android 版
3. 各アプリで「インタースティシャル」広告ユニットを作成
4. 取得した ID を `AdManager.js` と `AndroidManifest.xml`（Android）/ `Info.plist`（iOS）に設定

---

## リリースチェックリスト

- [ ] AdMob アプリ ID を本番用に設定（iOS / Android）
- [ ] 広告ユニット ID を本番用に設定
- [ ] `initializeForTesting: false` に変更
- [ ] `isTesting: false` に変更
- [ ] アプリアイコンを各プラットフォームに設定
- [ ] スクリーンショットを撮影
- [ ] プライバシーポリシーを Web に公開（GitHub Pages 等）
- [ ] デバッグログを確認・削除
- [ ] バージョン番号を確認
