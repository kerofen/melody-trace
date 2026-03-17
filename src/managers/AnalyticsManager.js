/**
 * AnalyticsManager - Firebase Analytics マネージャー
 * ネイティブでは Firebase Analytics、Web では no-op
 */

const isNative = () =>
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

export default class AnalyticsManager {
    static initialized = false;
    static analytics = null;

    static async initialize() {
        if (this.initialized) return;
        this.initialized = true;

        if (!isNative()) return;

        try {
            const { FirebaseAnalytics } = await import('@capacitor-community/firebase-analytics');
            this.analytics = FirebaseAnalytics;
        } catch (e) {
            console.warn('Firebase Analytics initialization failed:', e);
        }
    }

    static async logEvent(name, params = {}) {
        if (!this.analytics) return;
        try {
            await this.analytics.logEvent({ name, params });
        } catch (e) {
            console.warn('Analytics logEvent failed:', e);
        }
    }

    static async logPurchase(productId, value, currency = 'JPY') {
        if (!this.analytics) return;
        try {
            await this.analytics.logEvent({
                name: 'purchase',
                params: {
                    item_id: productId,
                    value,
                    currency,
                },
            });
        } catch (e) {
            console.warn('Analytics logPurchase failed:', e);
        }
    }

    static async logStageClear(stageKey, missCount, stars) {
        await this.logEvent('stage_clear', {
            stage_key: stageKey,
            miss_count: missCount,
            stars,
        });
    }

    static async logStageStart(stageKey) {
        await this.logEvent('stage_start', {
            stage_key: stageKey,
        });
    }

    static async logAdShown(adType) {
        await this.logEvent('ad_shown', {
            ad_type: adType,
        });
    }
}
