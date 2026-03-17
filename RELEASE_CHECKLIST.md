# リリースチェックリスト

## ビルド前

- [ ] `.env` の `VITE_ADMOB_TESTING=false` に変更
- [ ] `.env` の広告ユニットIDを本番用に設定
- [ ] `android/app/src/main/AndroidManifest.xml` の AdMob App ID を本番用に設定
- [ ] `ios/App/App/Info.plist` の `GADApplicationIdentifier` を本番用に設定
- [ ] `package.json` のバージョン番号を更新
- [ ] `android/app/build.gradle` の `versionCode` / `versionName` を更新
- [ ] `console.log` / `console.warn` のデバッグ出力を確認（必要に応じて削除）
- [ ] Firebase の `google-services.json`（Android）を配置済み
- [ ] Firebase の `GoogleService-Info.plist`（iOS）を配置済み

## AdMob

- [ ] AdMob コンソールでアプリを登録済み
- [ ] Android 用インタースティシャル広告ユニットID取得済み
- [ ] iOS 用インタースティシャル広告ユニットID取得済み
- [ ] テストデバイスで広告表示を確認

## 課金 (IAP)

- [ ] Google Play Console で商品（ad_removal_200yen）を登録済み
- [ ] App Store Connect で商品（ad_removal_200yen_ios）を登録済み
- [ ] `src/managers/IAPManager.js` の商品IDが正しいか確認
- [ ] テストアカウントで購入フローを確認
- [ ] 購入復元が正常に動作するか確認

## Android ビルド

- [ ] `android/variables.gradle`: minSdk=23, targetSdk=35, compileSdk=35
- [ ] `android/app/build.gradle`: minifyEnabled=true, shrinkResources=true
- [ ] `npm run build:android` でビルド成功
- [ ] Android Studio で「Generate Signed Bundle / APK」で AAB 作成
- [ ] 実機でテスト（広告、課金、アナリティクス）

## iOS ビルド（macOS で実行）

- [ ] `npx cap sync ios` → `cd ios/App && pod install`
- [ ] Xcode でプロジェクトを開く
- [ ] Signing Team を設定
- [ ] デプロイターゲットを iOS 14.0 に設定
- [ ] `Info.plist` の `NSUserTrackingUsageDescription` を確認
- [ ] `Info.plist` の `GADApplicationIdentifier` を本番用に設定
- [ ] `SKAdNetworkItems` が設定済みか確認
- [ ] 実機でテスト（ATT ダイアログ、広告、課金、アナリティクス）

## ストア申請

- [ ] アプリアイコン（1024x1024 PNG）準備済み
- [ ] スクリーンショット（iPhone: 5枚以上、Android: 2枚以上）準備済み
- [ ] アプリの説明文を準備
- [ ] プライバシーポリシーURL を設定（Web 上にホスト）
- [ ] コンテンツレーティング質問に回答
- [ ] 広告ありの申告
- [ ] アプリ内課金ありの申告
- [ ] Apple: App Review に提出前にレビューガイドラインを確認
- [ ] Google: 内部テスト → クローズドテスト → 本番リリースの順で進める
