/**
 * SoundManager - UI効果音 + ハプティクスユーティリティ
 * Web Audio APIで動的にUI効果音を生成（外部ファイル不要）
 * ネイティブ環境では @capacitor/haptics を使用
 */
import GameData from './GameData.js';

let audioCtx = null;
let HapticsPlugin = null;
let hapticsReady = false;

const isNative = () =>
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

async function initHaptics() {
    if (hapticsReady) return;
    if (isNative()) {
        try {
            const mod = await import('@capacitor/haptics');
            HapticsPlugin = mod.Haptics;
            hapticsReady = true;
        } catch (e) {
            /* fallback to navigator.vibrate */
        }
    }
}

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

const SoundManager = {
    async init() {
        await initHaptics();
    },

    playTapSE() {
        if (!GameData.getSettings().seEnabled) return;
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    },

    playDecideSE() {
        if (!GameData.getSettings().seEnabled) return;
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },

    playBackSE() {
        if (!GameData.getSettings().seEnabled) return;
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    },

    playToggleSE() {
        if (!GameData.getSettings().seEnabled) return;
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
    },

    playSuccessSE() {
        if (!GameData.getSettings().seEnabled) return;
        const ctx = getAudioContext();
        const freqs = [523, 659, 784];
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime + i * 0.05);
            osc.stop(ctx.currentTime + 0.4);
        });
    },

    playErrorSE() {
        if (!GameData.getSettings().seEnabled) return;
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
    },

    triggerHaptic(duration = 10) {
        if (!GameData.getSettings().hapticEnabled) return;
        if (hapticsReady && HapticsPlugin) {
            HapticsPlugin.impact({ style: 'Light' }).catch(() => {});
            return;
        }
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    },

    triggerHapticPattern(pattern) {
        if (!GameData.getSettings().hapticEnabled) return;
        if (hapticsReady && HapticsPlugin) {
            HapticsPlugin.vibrate({ duration: 50 }).catch(() => {});
            return;
        }
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    },
};

export default SoundManager;
