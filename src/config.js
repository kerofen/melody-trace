// ゲーム設定
export const GAME_W = 390;
export const GAME_H = 844;

// セーフエリア
export const SAFE = {
    TOP: 50,
    BOTTOM: 34
};

// カラーパレット
export const PALETTE = {
    bg: 0x1a1a2e,
    gridBg: 0x16213e,
    textLight: '#FFFFFF',
    textDark: '#4A4A4A',
};

// ============================================================
// 楽器定義（30種）
// ============================================================
export const INSTRUMENTS = {
    piano:           { name: 'グランドピアノ',   range: ['C3','C6'],  icon: '🎹', category: 'keyboard' },
    epiano:          { name: 'エレピ',           range: ['C3','C6'],  icon: '🎹', category: 'keyboard' },
    musicbox:        { name: 'オルゴール',        range: ['C4','C7'],  icon: '🎵', category: 'keyboard' },
    celesta:         { name: 'チェレスタ',        range: ['C4','C7'],  icon: '✨', category: 'keyboard' },
    violin:          { name: 'バイオリン',        range: ['G3','E7'],  icon: '🎻', category: 'strings' },
    cello:           { name: 'チェロ',           range: ['C2','C5'],  icon: '🎻', category: 'strings' },
    acoustic_guitar: { name: 'アコギ',           range: ['E2','E5'],  icon: '🎸', category: 'strings' },
    electric_guitar: { name: 'エレキギター',      range: ['E2','E5'],  icon: '🎸', category: 'strings' },
    ukulele:         { name: 'ウクレレ',          range: ['C4','A6'],  icon: '🪕', category: 'strings' },
    flute:           { name: 'フルート',          range: ['C4','C7'],  icon: '🎶', category: 'wind' },
    clarinet:        { name: 'クラリネット',      range: ['E3','C7'],  icon: '🎶', category: 'wind' },
    saxophone:       { name: 'サックス',          range: ['As3','F6'], icon: '🎷', category: 'wind' },  // Bb3 = As3
    trumpet:         { name: 'トランペット',      range: ['E3','C6'],  icon: '🎺', category: 'wind' },
    recorder:        { name: 'リコーダー',        range: ['C5','D7'],  icon: '🪈', category: 'wind' },
    ocarina:         { name: 'オカリナ',          range: ['C4','F6'],  icon: '🪈', category: 'wind' },
    vocal_ah_female: { name: '女性スキャット',    range: ['C4','C6'],  icon: '🎤', category: 'vocal' },
    vocal_oh_male:   { name: '男性スキャット',    range: ['C3','C5'],  icon: '🎤', category: 'vocal' },
    choir_ooh:       { name: '合唱',             range: ['C3','C6'],  icon: '🎤', category: 'vocal' },
    marimba:         { name: 'マリンバ',          range: ['C3','C7'],  icon: '🥁', category: 'mallet' },
    glockenspiel:    { name: '鉄琴',             range: ['C5','C8'],  icon: '🔔', category: 'mallet' },
    vibraphone:      { name: 'ビブラフォン',      range: ['F3','F6'],  icon: '🎵', category: 'mallet' },
    steel_drum:      { name: 'スチールドラム',    range: ['C4','C6'],  icon: '🥁', category: 'mallet' },
    synth_8bit:      { name: '8bit',             range: ['C3','C6'],  icon: '👾', category: 'synth' },
    synth_lead:      { name: 'シンセリード',      range: ['C3','C6'],  icon: '🎛️', category: 'synth' },
    synth_pad:       { name: 'シンセパッド',      range: ['C3','C6'],  icon: '🎛️', category: 'synth' },
    shamisen:        { name: '三味線',            range: ['C3','C6'],  icon: '🪕', category: 'world' },
    koto:            { name: '琴',               range: ['C3','C6'],  icon: '🎶', category: 'world' },
    erhu:            { name: '二胡',              range: ['D4','D7'],  icon: '🎻', category: 'world' },
    panflute:        { name: 'パンフルート',      range: ['C4','C7'],  icon: '🎶', category: 'world' },
    kalimba:         { name: 'カリンバ',          range: ['C4','C6'],  icon: '🎵', category: 'world' },
};

// ============================================================
// 半音階ユーティリティ
// ============================================================

/** オクターブ内の半音階名 */
const CHROMATIC = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];

/**
 * 音階ID（例: 'C4', 'Fs5'）を半音番号に変換（C0 = 0）
 */
function noteToSemitone(noteId) {
    const match = noteId.match(/^([A-G]s?)(\d)$/);
    if (!match) return -1;
    const [, name, octStr] = match;
    const octave = parseInt(octStr);
    const index = CHROMATIC.indexOf(name);
    if (index === -1) return -1;
    return octave * 12 + index;
}

/**
 * 半音番号を音階IDに変換
 */
function semitoneToNote(semitone) {
    const octave = Math.floor(semitone / 12);
    const index = semitone % 12;
    return `${CHROMATIC[index]}${octave}`;
}

/** C2〜C8 の全音階ID（73音） */
export const ALL_NOTES = (() => {
    const notes = [];
    for (let s = noteToSemitone('C2'); s <= noteToSemitone('C8'); s++) {
        notes.push(semitoneToNote(s));
    }
    return notes;
})();

/**
 * 指定範囲内の全音階IDを返す
 * @param {string} startNote - 開始音階ID（例: 'C3'）
 * @param {string} endNote - 終了音階ID（例: 'C6'）
 * @returns {string[]} 範囲内の全音階ID
 */
export function getNotesInRange(startNote, endNote) {
    const startSemi = noteToSemitone(startNote);
    const endSemi = noteToSemitone(endNote);
    if (startSemi === -1 || endSemi === -1) return [];
    const notes = [];
    for (let s = startSemi; s <= endSemi; s++) {
        notes.push(semitoneToNote(s));
    }
    return notes;
}

/**
 * 楽器IDと音階IDから音声ファイルパスを返す
 * @param {string} instrument - 楽器ID（例: 'piano', 'ocarina'）
 * @param {string} noteId - 音階ID（例: 'C4', 'Fs5'）
 * @returns {string} パス（例: 'assets/se/piano/C4.mp3'）
 */
export function getAudioPath(instrument, noteId) {
    return `assets/se/${instrument}/${noteId}.mp3`;
}

// ============================================================
// 音階の色（虹色ベース・全音域 C2〜C8）
// レインボーパターン: ド=赤, レ=橙, ミ=黄, ファ=緑, ソ=青, ラ=藍, シ=紫
// オクターブが上がるほど明度UP、下がるほど彩度DOWN
// ============================================================
export const NOTE_COLORS = {
    // --- C2-B2（非常に暗い・低彩度）---
    'C2':  0x8c3b3b,
    'Cs2': 0x8c2d2d,
    'D2':  0x8c5d2a,
    'Ds2': 0x8c4d20,
    'E2':  0x8c7722,
    'F2':  0x3b7041,
    'Fs2': 0x2b6538,
    'G2':  0x2a538c,
    'Gs2': 0x204683,
    'A2':  0x3b337f,
    'As2': 0x322976,
    'B2':  0x5c2f88,
    // --- C3-B3（暗め・やや低彩度）---
    'C3':  0xbf5050,
    'Cs3': 0xbf3e3e,
    'D3':  0xbf7f3a,
    'Ds3': 0xbf692c,
    'E3':  0xbfa32e,
    'F3':  0x509859,
    'Fs3': 0x3a8a4d,
    'G3':  0x3a71bf,
    'Gs3': 0x2c60b3,
    'A3':  0x5145ad,
    'As3': 0x4439a1,
    'B3':  0x7e40b9,
    // --- C4-B4（基準オクターブ・変更なし）---
    'C4':  0xff6b6b,   // ド - 赤
    'Cs4': 0xff5252,   // ド♯ - 濃い赤
    'D4':  0xffa94d,   // レ - オレンジ
    'Ds4': 0xff8c3a,   // レ♯ - 濃いオレンジ
    'E4':  0xffd93d,   // ミ - 黄
    'F4':  0x6bcb77,   // ファ - 緑
    'Fs4': 0x4db866,   // ファ♯ - 濃い緑
    'G4':  0x4d96ff,   // ソ - 青
    'Gs4': 0x3a7fee,   // ソ♯ - 濃い青
    'A4':  0x6c5ce7,   // ラ - 藍
    'As4': 0x5a4bd6,   // ラ♯ - 濃い藍
    'B4':  0xa855f7,   // シ - 紫
    // --- C5-B5（変更なし）---
    'C5':  0xf472b6,   // 高ド - ピンク
    'Cs5': 0xe855a0,   // 高ド♯ - 濃いピンク
    'D5':  0xffbd69,   // 高レ - 明るいオレンジ
    'Ds5': 0xffab4d,   // 高レ♯ - やや濃いオレンジ
    'E5':  0xffe066,   // 高ミ - 明るい黄
    'F5':  0x51cf66,   // 高ファ - 明るい緑
    'Fs5': 0x40b858,   // 高ファ♯ - やや濃い緑
    'G5':  0x74b9ff,   // 高ソ - 明るい青
    'Gs5': 0x5da4ee,   // 高ソ♯ - やや濃い青
    'A5':  0x9b8ce7,   // 高ラ - 明るい藍
    'As5': 0x8a7bd6,   // 高ラ♯ - やや濃い藍
    'B5':  0xc084fc,   // 高シ - 明るい紫
    // --- C6-B6（明るいパステル）---
    'C6':  0xff9ff3,   // ド↑↑ - ライトピンク（変更なし）
    'Cs6': 0xff88e8,   // ド♯↑↑
    'D6':  0xffd090,   // レ↑↑
    'Ds6': 0xffc278,   // レ♯↑↑
    'E6':  0xffeb88,   // ミ↑↑
    'F6':  0x78e090,   // ファ↑↑
    'Fs6': 0x60d47c,   // ファ♯↑↑
    'G6':  0x90ccff,   // ソ↑↑
    'Gs6': 0x78bcf5,   // ソ♯↑↑
    'A6':  0xb0a0f0,   // ラ↑↑
    'As6': 0xa090e5,   // ラ♯↑↑
    'B6':  0xd4a0ff,   // シ↑↑
    // --- C7-B7（非常に明るいパステル）---
    'C7':  0xffc4f0,   // ド↑↑↑
    'Cs7': 0xffb0e5,   // ド♯↑↑↑
    'D7':  0xffe2b0,   // レ↑↑↑
    'Ds7': 0xffd898,   // レ♯↑↑↑
    'E7':  0xfff2b0,   // ミ↑↑↑
    'F7':  0x98f0b0,   // ファ↑↑↑
    'Fs7': 0x85e8a0,   // ファ♯↑↑↑
    'G7':  0xb0dcff,   // ソ↑↑↑
    'Gs7': 0x98d0ff,   // ソ♯↑↑↑
    'A7':  0xc8c0f8,   // ラ↑↑↑
    'As7': 0xb8b0f0,   // ラ♯↑↑↑
    'B7':  0xe2c0ff,   // シ↑↑↑
    // --- C8 ---
    'C8':  0xffd8f0,   // ド↑↑↑↑
};

// 音階の日本語名（全音域 C2〜C8）
export const NOTE_NAMES = {
    // --- C2-B2 ---
    'C2':  'ド↓↓',
    'Cs2': 'ド♯↓↓',
    'D2':  'レ↓↓',
    'Ds2': 'レ♯↓↓',
    'E2':  'ミ↓↓',
    'F2':  'ファ↓↓',
    'Fs2': 'ファ♯↓↓',
    'G2':  'ソ↓↓',
    'Gs2': 'ソ♯↓↓',
    'A2':  'ラ↓↓',
    'As2': 'ラ♯↓↓',
    'B2':  'シ↓↓',
    // --- C3-B3 ---
    'C3':  'ド↓',
    'Cs3': 'ド♯↓',
    'D3':  'レ↓',
    'Ds3': 'レ♯↓',
    'E3':  'ミ↓',
    'F3':  'ファ↓',
    'Fs3': 'ファ♯↓',
    'G3':  'ソ↓',
    'Gs3': 'ソ♯↓',
    'A3':  'ラ↓',
    'As3': 'ラ♯↓',
    'B3':  'シ↓',
    // --- C4-B4（基準オクターブ・変更なし）---
    'C4':  'ド',
    'Cs4': 'ド♯',
    'D4':  'レ',
    'Ds4': 'レ♯',
    'E4':  'ミ',
    'F4':  'ファ',
    'Fs4': 'ファ♯',
    'G4':  'ソ',
    'Gs4': 'ソ♯',
    'A4':  'ラ',
    'As4': 'ラ♯',
    'B4':  'シ',
    // --- C5-B5（変更なし）---
    'C5':  'ド↑',
    'Cs5': 'ド♯↑',
    'D5':  'レ↑',
    'Ds5': 'レ♯↑',
    'E5':  'ミ↑',
    'F5':  'ファ↑',
    'Fs5': 'ファ♯↑',
    'G5':  'ソ↑',
    'Gs5': 'ソ♯↑',
    'A5':  'ラ↑',
    'As5': 'ラ♯↑',
    'B5':  'シ↑',
    // --- C6-B6 ---
    'C6':  'ド↑↑',
    'Cs6': 'ド♯↑↑',
    'D6':  'レ↑↑',
    'Ds6': 'レ♯↑↑',
    'E6':  'ミ↑↑',
    'F6':  'ファ↑↑',
    'Fs6': 'ファ♯↑↑',
    'G6':  'ソ↑↑',
    'Gs6': 'ソ♯↑↑',
    'A6':  'ラ↑↑',
    'As6': 'ラ♯↑↑',
    'B6':  'シ↑↑',
    // --- C7-B7 ---
    'C7':  'ド↑↑↑',
    'Cs7': 'ド♯↑↑↑',
    'D7':  'レ↑↑↑',
    'Ds7': 'レ♯↑↑↑',
    'E7':  'ミ↑↑↑',
    'F7':  'ファ↑↑↑',
    'Fs7': 'ファ♯↑↑↑',
    'G7':  'ソ↑↑↑',
    'Gs7': 'ソ♯↑↑↑',
    'A7':  'ラ↑↑↑',
    'As7': 'ラ♯↑↑↑',
    'B7':  'シ↑↑↑',
    // --- C8 ---
    'C8':  'ド↑↑↑↑',
};

// テキストスタイル
export const TEXT_STYLE = {
    title: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '48px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 6,
    },
    subtitle: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '24px',
        color: '#FFFFFF',
    },
    button: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '28px',
        color: '#FFFFFF',
        stroke: '#00000055',
        strokeThickness: 4,
    },
    note: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
    },
    small: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '14px',
        color: '#888888',
    },
};

// メニューボタンカラー
export const MENU_COLORS = {
    stageSelect: 0x4d96ff,
    stageEditor: 0x6bcb77,
    shop: 0xffd93d,
    settings: 0x888888,
    back: 0x444444,
    danger: 0xff5252,
    gold: 0xffd93d,
    toggleOn: 0x4d96ff,
    toggleOff: 0x555555,
};

// グリッド設定
export const GRID = {
    SIZE: 6,
    CELL_SIZE: 52,
    GAP: 4,
};
