/**
 * AdManager - 広告管理マネージャー
 * Web開発時はモック広告、Capacitorビルド時はAdMobインタースティシャルを表示
 */
import GameData from './GameData.js';
import IAPManager from './IAPManager.js';

const isNative = () =>
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

const IS_TESTING = import.meta.env.VITE_ADMOB_TESTING === 'true';

const AD_UNIT_IDS = {
    ios: {
        interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_IOS || 'ca-app-pub-3940256099942544/4411468910',
    },
    android: {
        interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_ANDROID || 'ca-app-pub-3940256099942544/1033173712',
    },
    test: {
        interstitial: 'ca-app-pub-3940256099942544/1033173712',
    },
};

function getPlatformIds() {
    if (!isNative() || IS_TESTING) return AD_UNIT_IDS.test;
    const platform = window.Capacitor.getPlatform();
    return AD_UNIT_IDS[platform] || AD_UNIT_IDS.test;
}

export default class AdManager {
    static initialized = false;
    static interstitialLoaded = false;

    static async initialize() {
        if (this.initialized) return;
        this.initialized = true;

        if (!isNative()) return;

        try {
            const { AdMob } = await import('@capacitor-community/admob');

            if (window.Capacitor.getPlatform() === 'ios') {
                await AdMob.requestTrackingAuthorization();
            }

            await AdMob.initialize({
                initializeForTesting: IS_TESTING,
            });

            AdMob.addListener('onInterstitialAdLoaded', () => {
                this.interstitialLoaded = true;
            });
            AdMob.addListener('onInterstitialAdFailedToLoad', () => {
                this.interstitialLoaded = false;
            });

            await this.prepareInterstitial();
        } catch (e) {
            console.warn('AdMob initialization failed:', e);
        }
    }

    static async prepareInterstitial() {
        if (!isNative()) return;
        try {
            const { AdMob } = await import('@capacitor-community/admob');
            const ids = getPlatformIds();
            await AdMob.prepareInterstitial({
                adId: ids.interstitial,
                isTesting: IS_TESTING,
            });
        } catch (e) {
            console.warn('Interstitial prepare failed:', e);
        }
    }

    static shouldShowAd() {
        if (IAPManager.isAdRemovalPurchased()) return false;
        const stats = GameData.getStats();
        if (stats.totalClears < 3) return false;
        const adState = GameData.getAdState();
        return adState.clearsSinceLastAd >= 2;
    }

    /**
     * ステージクリア時に呼び出す
     * @param {Phaser.Scene} scene - 現在のシーン
     * @returns {Promise<boolean>} 広告を表示したかどうか
     */
    static async onStageClear(scene) {
        GameData.incrementClearsSinceAd();

        if (!this.shouldShowAd()) {
            return false;
        }

        GameData.resetClearsSinceAd();
        await this.showInterstitial(scene);
        return true;
    }

    static showInterstitial(scene) {
        if (isNative()) {
            return this.showNativeInterstitial();
        }
        return this.showMockInterstitial(scene);
    }

    static async showNativeInterstitial() {
        try {
            const { AdMob } = await import('@capacitor-community/admob');
            await AdMob.showInterstitial();
        } catch (e) {
            console.warn('Interstitial show failed:', e);
        }
        await this.prepareInterstitial();
    }

    /**
     * モック全画面広告（Web開発用）
     */
    static showMockInterstitial(scene) {
        return new Promise((resolve) => {
            const { width, height } = scene.cameras.main;
            const overlay = scene.add.graphics();
            overlay.fillStyle(0x000000, 0.92);
            overlay.fillRect(0, 0, width, height);
            overlay.setDepth(9999);

            const adLabel = scene.add.text(width / 2, height * 0.3, '広告', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '28px',
                color: '#999999',
            }).setOrigin(0.5).setDepth(10000);

            const countdownText = scene.add.text(width / 2, height / 2, '3', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '64px',
                color: '#FFFFFF',
            }).setOrigin(0.5).setDepth(10000);

            const skipHint = scene.add.text(width / 2, height * 0.7, '', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '18px',
                color: '#666666',
            }).setOrigin(0.5).setDepth(10000);

            let countdown = 3;
            scene.time.addEvent({
                delay: 1000,
                repeat: 2,
                callback: () => {
                    countdown--;
                    if (countdown > 0) {
                        countdownText.setText(`${countdown}`);
                    } else {
                        countdownText.setText('');
                        skipHint.setText('タップして閉じる');

                        overlay.setInteractive(
                            new Phaser.Geom.Rectangle(0, 0, width, height),
                            Phaser.Geom.Rectangle.Contains
                        );
                        overlay.on('pointerup', () => {
                            overlay.destroy();
                            adLabel.destroy();
                            countdownText.destroy();
                            skipHint.destroy();
                            resolve();
                        });
                    }
                },
            });
        });
    }

    /**
     * 広告削除後のソフト提案を表示
     * @returns {Promise<boolean>} ショップへ行くかどうか
     */
    static showRemoveAdPrompt(scene) {
        return new Promise((resolve) => {
            const { width, height } = scene.cameras.main;

            const banner = scene.add.container(width / 2, height * 0.85);
            banner.setDepth(9998);
            banner.setAlpha(0);

            const bg = scene.add.graphics();
            bg.fillStyle(0x1e2a4a, 0.95);
            bg.fillRoundedRect(-160, -28, 320, 56, 14);
            banner.add(bg);

            const text = scene.add.text(0, 0, '広告なしで遊ぶ →', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '18px',
                color: '#ffd93d',
            }).setOrigin(0.5);
            banner.add(text);

            banner.setSize(320, 56).setInteractive({ useHandCursor: true });

            scene.tweens.add({
                targets: banner,
                alpha: 1,
                duration: 400,
                delay: 500,
            });

            banner.on('pointerup', () => {
                banner.destroy();
                resolve(true);
            });

            scene.time.delayedCall(4000, () => {
                if (banner.active) {
                    scene.tweens.add({
                        targets: banner,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            if (banner.active) banner.destroy();
                            resolve(false);
                        },
                    });
                }
            });
        });
    }
}
