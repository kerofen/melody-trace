/**
 * IAPManager - ストア課金マネージャー
 * cordova-plugin-purchase (CdvPurchase) を使用した実課金処理
 * Web開発時はモック、ネイティブではGoogle Play / App Storeの実課金を実行
 */
import GameData from './GameData.js';

const isNative = () =>
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

const PRODUCT_IDS = {
    android: 'ad_removal_480yen',
    ios: 'ad_removal_480yen_ios',
};

function getProductId() {
    if (!isNative()) return PRODUCT_IDS.android;
    const platform = window.Capacitor.getPlatform();
    return PRODUCT_IDS[platform] || PRODUCT_IDS.android;
}

function getPlatformEnum() {
    if (!isNative()) return null;
    const platform = window.Capacitor.getPlatform();
    if (platform === 'ios') return CdvPurchase.Platform.APPLE_APPSTORE;
    return CdvPurchase.Platform.GOOGLE_PLAY;
}

export default class IAPManager {
    static initialized = false;
    static store = null;
    static adRemovalProduct = null;
    static _purchaseCallbacks = [];

    static async initialize() {
        if (this.initialized) return;
        this.initialized = true;

        if (!isNative()) return;

        try {
            await this._waitForStore();
            this.store = CdvPurchase.store;

            const platformEnum = getPlatformEnum();
            const productId = getProductId();

            this.store.register([{
                id: productId,
                type: CdvPurchase.ProductType.NON_CONSUMABLE,
                platform: platformEnum,
            }]);

            this.store.when()
                .approved(transaction => {
                    transaction.verify();
                })
                .verified(receipt => {
                    receipt.finish();
                    GameData.setPurchased('adFree');
                    this._resolvePurchaseCallbacks(true);
                })
                .unverified(receipt => {
                    console.warn('IAP: unverified receipt', receipt);
                    this._resolvePurchaseCallbacks(false);
                });

            this.store.error(err => {
                console.warn('IAP store error:', err);
                this._resolvePurchaseCallbacks(false);
            });

            await this.store.initialize([platformEnum]);

            this._checkExistingPurchases();
        } catch (e) {
            console.warn('IAP initialization failed:', e);
        }
    }

    static _waitForStore() {
        return new Promise((resolve, reject) => {
            if (typeof CdvPurchase !== 'undefined') {
                resolve();
                return;
            }
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (typeof CdvPurchase !== 'undefined') {
                    clearInterval(interval);
                    resolve();
                } else if (attempts > 50) {
                    clearInterval(interval);
                    reject(new Error('CdvPurchase not available'));
                }
            }, 100);
        });
    }

    static _checkExistingPurchases() {
        if (!this.store) return;
        const product = this.getProduct();
        if (product && product.owned) {
            GameData.setPurchased('adFree');
        }
    }

    static _resolvePurchaseCallbacks(success) {
        const callbacks = this._purchaseCallbacks.splice(0);
        callbacks.forEach(cb => cb(success));
    }

    static getProduct() {
        if (!this.store) return null;
        const productId = getProductId();
        return this.store.get(productId) || null;
    }

    static getPrice() {
        const product = this.getProduct();
        if (product && product.pricing) {
            return product.pricing.price;
        }
        return '¥480';
    }

    static isAdRemovalPurchased() {
        return GameData.isPurchased('adFree');
    }

    /**
     * 購入を開始
     * @returns {Promise<boolean>} 購入成功かどうか
     */
    static async purchase() {
        if (!isNative()) {
            GameData.setPurchased('adFree');
            return true;
        }

        const product = this.getProduct();
        if (!product) {
            console.warn('IAP: product not found');
            return false;
        }

        return new Promise((resolve) => {
            this._purchaseCallbacks.push(resolve);

            const offer = product.getOffer();
            if (offer) {
                this.store.order(offer).catch(err => {
                    console.warn('IAP: order failed', err);
                    this._resolvePurchaseCallbacks(false);
                });
            } else {
                this._resolvePurchaseCallbacks(false);
            }
        });
    }

    /**
     * 購入を復元（Apple審査で必須）
     * @returns {Promise<boolean>} 復元成功かどうか
     */
    static async restorePurchases() {
        if (!isNative()) {
            return GameData.isPurchased('adFree');
        }

        if (!this.store) return false;

        try {
            await this.store.restorePurchases();
            await new Promise(r => setTimeout(r, 2000));

            this._checkExistingPurchases();
            return GameData.isPurchased('adFree');
        } catch (e) {
            console.warn('IAP: restore failed', e);
            return false;
        }
    }
}
