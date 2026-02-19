/**
 * ShareCode - ステージデータの共有コードエンコード/デコード
 * フォーマット: "MT1-" + Base64エンコードされたJSON
 */
import { INSTRUMENTS } from '../config.js';

const PREFIX = 'MT1-';
const MAX_NOTES = 30;

/**
 * ステージデータを共有コードにエンコード
 * @param {{ instrument: string, title: string, answer: string[] }} stageData
 * @returns {string} 共有コード
 */
export function encodeStage(stageData) {
    const compact = {
        i: stageData.instrument || 'piano',
        t: stageData.title || 'マイステージ',
        n: stageData.answer,
    };
    const json = JSON.stringify(compact);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return PREFIX + base64;
}

/**
 * 共有コードをステージデータにデコード
 * @param {string} code - 共有コード
 * @returns {{ instrument: string, title: string, answer: string[] } | null} デコード結果（失敗時null）
 */
export function decodeStage(code) {
    try {
        if (!code || !code.startsWith(PREFIX)) {
            return null;
        }

        const base64 = code.slice(PREFIX.length);
        const json = decodeURIComponent(escape(atob(base64)));
        const compact = JSON.parse(json);

        if (!compact.n || !Array.isArray(compact.n)) return null;
        if (compact.n.length === 0 || compact.n.length > MAX_NOTES) return null;

        const notePattern = /^[A-G]s?\d$/;
        for (const note of compact.n) {
            if (!notePattern.test(note)) return null;
        }

        const instrument = compact.i || 'piano';
        if (!INSTRUMENTS[instrument]) return null;

        return {
            instrument,
            title: compact.t || 'シェアステージ',
            answer: compact.n,
        };
    } catch (e) {
        console.warn('ShareCode decode failed:', e);
        return null;
    }
}
