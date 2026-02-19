/**
 * ステージデータ
 * 
 * answer: 正解の音階順序
 * title: ステージ名
 * hint: ヒント表示
 * instrument: 楽器ID（デフォルト: 'piano'）
 * 
 * gridは自動生成される
 */

import { INSTRUMENTS, getNotesInRange } from '../config.js';

// きらきら星: ドドソソララソ ファファミミレレド
export const STAGES = {
    twinkleStar: {
        title: 'きらきら星',
        hint: 'きらきらひかる おそらのほしよ',
        instrument: 'piano',
        answer: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'],
    },
    // よろこびの歌（ベートーヴェン「第九」より、1824年）ハ長調 ※パブリックドメイン
    // ミミファソ ソファミレ ドドレミ ミーレレー | ミミファソ ソファミレ ドドレミ レードドー（30音）
    odeToJoy: {
        title: 'よろこびの歌',
        hint: 'はれたるあおぞら ただよう くもよ',
        instrument: 'piano',
        answer: [
            'E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4',     // ミミファソ ソファミレ
            'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4',             // ドドレミ ミーレレー
            'E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4',     // ミミファソ ソファミレ
            'C4', 'C4', 'D4', 'E4', 'D4', 'C4', 'C4',             // ドドレミ レードドー
        ],
    },
    // ジングルベル（J.S.ピアポント、1857年）ハ長調 ※パブリックドメイン
    // ミミミ ミミミ ミソドレミ ファファファファ ファミミミ ソソファレド（24音）
    jingleBells: {
        title: 'ジングルベル',
        hint: 'ジングルベル ジングルベル すずがなる',
        instrument: 'piano',
        answer: [
            'E4', 'E4', 'E4',                                     // ジングルベル
            'E4', 'E4', 'E4',                                     // ジングルベル
            'E4', 'G4', 'C4', 'D4', 'E4',                         // すずがなる
            'F4', 'F4', 'F4', 'F4',                               // おーわっとふぁん
            'F4', 'E4', 'E4', 'E4',                               // いっとぅらいど
            'G4', 'G4', 'F4', 'D4', 'C4',                         // いなわんほーす
        ],
    },
    // かえるのうた（ドイツ民謡）ハ長調
    // か(ド) え(レ) る(ミ) の(ファ) う(ミ) た(レ) が(ド)
    // き(ミ) こ(ファ) え(ソ) て(ラ) く(ソ) る(ファ) よ(ミ)
    // が(ド) が(ド) が(ド) が(ド)
    // げろ(ドド) げろ(レレ) げろ(ミミ) げろ(ファファ)
    // がっ(ミ) がっ(レ) が(ド)
    // ド→レ→ミ→ファ→ミ→レ→ド→ミ→ファ→ソ→ラ→ソ→ファ→ミ→ド→ド→ド→ド→ドド→レレ→ミミ→ファファ→ミ→レ→ド（29音）
    kaeruNoUta: {
        title: 'かえるのうた',
        hint: 'かえるのうたが きこえてくるよ が が が が',
        instrument: 'piano',
        answer: [
            'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'C4',           // かえるのうたが
            'E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'E4',           // きこえてくるよ
            'C4', 'C4', 'C4', 'C4',                               // が が が が
            'C4', 'C4', 'D4', 'D4', 'E4', 'E4', 'F4', 'F4',     // げろげろげろげろ
            'E4', 'D4', 'C4',                                     // がっがっが
        ],
    },
    // ちょうちょう（ドイツ民謡）ハ長調
    // ソミミ ファレレ ドレミファ ソソソ | ソミミミ ファレレレ ドミソソ ミミミ（26音）
    chouchou: {
        title: 'ちょうちょう',
        hint: 'ちょうちょう ちょうちょう なのはにとまれ',
        instrument: 'piano',
        answer: [
            'G4', 'E4', 'E4', 'F4', 'D4', 'D4', 'C4', 'D4', 'E4', 'F4', 'G4', 'G4', 'G4',  // 1番前半
            'G4', 'E4', 'E4', 'E4', 'F4', 'D4', 'D4', 'D4', 'C4', 'E4', 'G4', 'G4', 'E4',  // 1番後半
        ],
    },
    // ぶんぶんぶん（ボヘミア民謡）ハ長調
    // ソファミ レミファレド ミファソミ レミファレ ミファソミ レミファレ ソファミ レミファレド（32音）
    bunbunbun: {
        title: 'ぶんぶんぶん',
        hint: 'ぶんぶんぶん はちがとぶ',
        instrument: 'piano',
        answer: [
            'G4', 'F4', 'E4',                                     // ぶんぶんぶん
            'D4', 'E4', 'F4', 'D4', 'C4',                         // はちがとぶ
            'E4', 'F4', 'G4', 'E4',                               // おいけの
            'D4', 'E4', 'F4', 'D4',                               // まわりに
            'E4', 'F4', 'G4', 'E4',                               // のばらが
            'D4', 'E4', 'F4', 'D4',                               // さいたよ
            'G4', 'F4', 'E4',                                     // ぶんぶんぶん
            'D4', 'E4', 'F4', 'D4', 'C4',                         // はちがとぶ
        ],
    },
    // メリーさんのひつじ（アメリカ民謡）ハ長調
    // ミレドレ ミミミ レレレ ミソソ | ミレドレ ミミミ レレレミレ ド（26音）
    maryLamb: {
        title: 'メリーさんのひつじ',
        hint: 'メリーさんのひつじ めえめえめえ',
        instrument: 'piano',
        answer: [
            'E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4',             // メリーさんのひつじ
            'D4', 'D4', 'D4',                                     // めえめえ
            'E4', 'G4', 'G4',                                     // ソソ
            'E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4',             // メリーさんのひつじ
            'D4', 'D4', 'D4', 'E4', 'D4', 'C4',                   // かわいいな
        ],
    },
    // ロンドン橋（イギリス民謡）ハ長調 ※パブリックドメイン
    // ソラソファ ミファソ レミファ ミファソ ソラソファ ミファソ レソミド（24音）
    londonBridge: {
        title: 'ロンドン橋',
        hint: 'ロンドンばし おちた おちた おちた',
        instrument: 'piano',
        answer: [
            'G4', 'A4', 'G4', 'F4', 'E4', 'F4', 'G4',             // ロンドンばしが
            'D4', 'E4', 'F4',                                     // おちる
            'E4', 'F4', 'G4',                                     // おちる
            'G4', 'A4', 'G4', 'F4', 'E4', 'F4', 'G4',             // ロンドンばしが
            'D4', 'G4', 'E4', 'C4',                               // おちた
        ],
    },
    // 蛍の光（スコットランド民謡）ハ長調
    // ソドドド ミレドレ ミドドミソラ | ラソミミ ドレドレ ミドララソド（28音）
    hotaruNoHikari: {
        title: '蛍の光',
        hint: 'ほたるのひかり まどのゆき',
        instrument: 'piano',
        answer: [
            'G4', 'C4', 'C4', 'C4',                               // ほたるの
            'E4', 'D4', 'C4', 'D4',                               // ひかり
            'E4', 'C4', 'C4', 'E4', 'G4', 'A4',                   // まどのゆき
            'A4', 'G4', 'E4', 'E4',                               // ふみよむ
            'C4', 'D4', 'C4', 'D4',                               // つきひ
            'E4', 'C4', 'A4', 'A4', 'G4', 'C4',                   // かさねつつ
        ],
    },
};

/**
 * 楽器の音域からダミー音符リストを取得
 * @param {string} instrumentId - 楽器ID
 * @returns {string[]} 音域内の全音階ID
 */
function getDummyNotesForInstrument(instrumentId) {
    const inst = INSTRUMENTS[instrumentId];
    if (!inst) {
        // フォールバック: ピアノの音域
        return getNotesInRange('C3', 'C6');
    }
    return getNotesInRange(inst.range[0], inst.range[1]);
}

/**
 * 正解の音階から一筆書き可能なグリッドを自動生成
 * @param {string[]} answer - 正解の音階配列
 * @param {number} gridSize - グリッドサイズ（デフォルト6）
 * @param {string} instrumentId - 楽器ID（デフォルト: 'piano'）
 * @returns {{ grid: (string|null)[][], solutionPath: {row: number, col: number}[] }}
 */
export function generateGrid(answer, gridSize = 6, instrumentId = 'piano') {
    const maxAttempts = 100; // 最大試行回数
    const dummyNotes = getDummyNotesForInstrument(instrumentId);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = tryGenerateGrid(answer, gridSize, dummyNotes);
        if (result) {
            return result;
        }
    }
    
    // 失敗した場合はシンプルな直線パスで生成
    console.warn('Using fallback linear path');
    return generateLinearGrid(answer, gridSize, dummyNotes);
}

/**
 * 配列をシャッフル（Fisher-Yates）
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * 範囲内のランダム整数
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * グリッド生成を1回試行
 */
function tryGenerateGrid(answer, gridSize, dummyNotes) {
    // 空のグリッド
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const solutionPath = [];
    
    // 8方向の移動ベクトル（上下左右＋斜め）
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    // スタート位置をランダムに決定（中央寄り）
    const margin = 1;
    let startRow = randomInt(margin, gridSize - margin - 1);
    let startCol = randomInt(margin, gridSize - margin - 1);
    
    // パスを生成
    let currentRow = startRow;
    let currentCol = startCol;
    const visited = new Set();
    
    for (let i = 0; i < answer.length; i++) {
        const key = `${currentRow},${currentCol}`;
        
        // 既に訪問済みなら失敗
        if (visited.has(key)) {
            return null;
        }
        
        // 現在位置を記録
        visited.add(key);
        grid[currentRow][currentCol] = answer[i];
        solutionPath.push({ row: currentRow, col: currentCol });
        
        // 最後の音符なら終了
        if (i === answer.length - 1) {
            break;
        }
        
        // 次の位置を探す
        const validMoves = [];
        
        // シャッフルした方向順で探索
        const shuffledDirs = shuffleArray(directions);
        
        for (const [dr, dc] of shuffledDirs) {
            const newRow = currentRow + dr;
            const newCol = currentCol + dc;
            const newKey = `${newRow},${newCol}`;
            
            // 範囲内かつ未訪問
            if (newRow >= 0 && newRow < gridSize &&
                newCol >= 0 && newCol < gridSize &&
                !visited.has(newKey)) {
                
                // 残りの音符数に対して十分なスペースがあるか確認
                const remaining = answer.length - i - 1;
                const availableSpace = countAvailableSpace(grid, newRow, newCol, visited, gridSize, remaining);
                
                if (availableSpace >= remaining) {
                    validMoves.push({ row: newRow, col: newCol, space: availableSpace });
                }
            }
        }
        
        if (validMoves.length === 0) {
            return null; // 行き詰まり
        }
        
        // 移動可能なマスからランダムに選択（スペースが多いものを優先）
        validMoves.sort((a, b) => b.space - a.space);
        const topMoves = validMoves.slice(0, Math.min(3, validMoves.length));
        const nextMove = topMoves[Math.floor(Math.random() * topMoves.length)];
        
        currentRow = nextMove.row;
        currentCol = nextMove.col;
    }
    
    // ダミー音符で残りのマスを埋める
    fillDummyNotes(grid, gridSize, answer, dummyNotes);
    
    return { grid, solutionPath };
}

/**
 * 指定位置から到達可能なマス数をカウント（簡易版）
 */
function countAvailableSpace(grid, startRow, startCol, visited, gridSize, maxCount) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    const queue = [{ row: startRow, col: startCol }];
    const checked = new Set([`${startRow},${startCol}`]);
    let count = 0;
    
    while (queue.length > 0 && count < maxCount + 5) {
        const { row, col } = queue.shift();
        count++;
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            const key = `${newRow},${newCol}`;
            
            if (newRow >= 0 && newRow < gridSize &&
                newCol >= 0 && newCol < gridSize &&
                !visited.has(key) &&
                !checked.has(key) &&
                grid[newRow][newCol] === null) {
                checked.add(key);
                queue.push({ row: newRow, col: newCol });
            }
        }
    }
    
    return count;
}

/**
 * 残りのマスをダミー音符で埋める（楽器の音域に対応）
 */
function fillDummyNotes(grid, gridSize, answer, dummyNotes) {
    // 正解に含まれない音符を優先的にダミーとして使う
    const answerSet = new Set(answer);
    const preferredDummy = dummyNotes.filter(n => !answerSet.has(n));
    const allDummy = preferredDummy.length > 0 ? [...preferredDummy, ...dummyNotes] : dummyNotes;
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (grid[row][col] === null) {
                // ランダムなダミー音符を配置
                const randomNote = allDummy[Math.floor(Math.random() * allDummy.length)];
                grid[row][col] = randomNote;
            }
        }
    }
}

/**
 * フォールバック：直線的なパスで生成
 */
function generateLinearGrid(answer, gridSize, dummyNotes) {
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const solutionPath = [];
    
    // 蛇行パターンで配置
    let row = 0;
    let col = 0;
    let direction = 1; // 1: 右, -1: 左
    
    for (let i = 0; i < answer.length; i++) {
        grid[row][col] = answer[i];
        solutionPath.push({ row, col });
        
        if (i < answer.length - 1) {
            // 次の位置
            const nextCol = col + direction;
            
            if (nextCol >= 0 && nextCol < gridSize) {
                col = nextCol;
            } else {
                // 行を変えて方向転換
                row++;
                direction *= -1;
            }
        }
    }
    
    // ダミーで埋める
    fillDummyNotes(grid, gridSize, answer, dummyNotes);
    
    return { grid, solutionPath };
}

export default STAGES;
