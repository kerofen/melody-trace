/**
 * GameData - ゲームデータの永続化マネージャー
 * 設定、課金状態、カスタムステージ、広告状態をlocalStorageで管理
 */
export default class GameData {
    static STORAGE_KEY = 'melody_trace_data';

    static getDefaultData() {
        return {
            settings: {
                bgmEnabled: true,
                seEnabled: true,
                hapticEnabled: true,
            },
            stats: {
                totalClears: 0,
                totalPlays: 0,
                clearedStages: [],
                stageResults: {},
            },
            purchases: {
                adFree: false,
            },
            adState: {
                clearsSinceLastAd: 0,
                totalAdsShown: 0,
            },
            customStages: [],
        };
    }

    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const defaults = this.getDefaultData();
                return {
                    settings: { ...defaults.settings, ...parsed.settings },
                    stats: { ...defaults.stats, ...parsed.stats },
                    purchases: { ...defaults.purchases, ...parsed.purchases },
                    adState: { ...defaults.adState, ...parsed.adState },
                    customStages: parsed.customStages || [],
                };
            }
        } catch (e) {
            console.warn('GameData load failed:', e);
        }
        return this.getDefaultData();
    }

    static save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('GameData save failed:', e);
        }
    }

    /** 現在のデータを取得（毎回最新をロード） */
    static getData() {
        return this.load();
    }

    // --- 設定 ---
    static getSettings() {
        return this.load().settings;
    }

    static setSetting(key, value) {
        const data = this.load();
        data.settings[key] = value;
        this.save(data);
    }

    // --- 統計 ---
    static getStats() {
        return this.load().stats;
    }

    static recordClear(stageKey) {
        const data = this.load();
        data.stats.totalClears++;
        if (stageKey && !data.stats.clearedStages.includes(stageKey)) {
            data.stats.clearedStages.push(stageKey);
        }
        this.save(data);
    }

    static recordPlay() {
        const data = this.load();
        data.stats.totalPlays++;
        this.save(data);
    }

    /** ステージクリア結果を保存（星評価用） */
    static saveStageResult(stageKey, missCount) {
        if (!stageKey) return;
        const data = this.load();
        if (!data.stats.stageResults) data.stats.stageResults = {};
        const prev = data.stats.stageResults[stageKey];
        // ベストスコア（ミス数が少ない方）を保持
        if (!prev || missCount < prev.missCount) {
            let stars;
            if (missCount === 0) stars = 3;
            else if (missCount <= 2) stars = 2;
            else stars = 1;
            data.stats.stageResults[stageKey] = { missCount, stars };
        }
        this.save(data);
    }

    /** ステージ結果を取得 */
    static getStageResult(stageKey) {
        if (!stageKey) return null;
        const data = this.load();
        if (!data.stats.stageResults) return null;
        return data.stats.stageResults[stageKey] || null;
    }

    /** 全ステージ結果を取得 */
    static getAllStageResults() {
        const data = this.load();
        return data.stats.stageResults || {};
    }

    // --- 課金 ---
    static isPurchased(key) {
        return this.load().purchases[key] === true;
    }

    static setPurchased(key) {
        const data = this.load();
        data.purchases[key] = true;
        this.save(data);
    }

    // --- 広告状態 ---
    static getAdState() {
        return this.load().adState;
    }

    static incrementClearsSinceAd() {
        const data = this.load();
        data.adState.clearsSinceLastAd++;
        this.save(data);
    }

    static resetClearsSinceAd() {
        const data = this.load();
        data.adState.clearsSinceLastAd = 0;
        data.adState.totalAdsShown++;
        this.save(data);
    }

    // --- カスタムステージ ---
    static getCustomStages() {
        return this.load().customStages;
    }

    static addCustomStage(stage) {
        const data = this.load();
        const newStage = {
            id: 'custom_' + Date.now(),
            title: stage.title || 'マイステージ',
            instrument: stage.instrument || 'piano',
            answer: stage.answer,
            createdAt: new Date().toISOString(),
        };
        data.customStages.push(newStage);
        this.save(data);
        return newStage;
    }

    static removeCustomStage(id) {
        const data = this.load();
        data.customStages = data.customStages.filter(s => s.id !== id);
        this.save(data);
    }
}
