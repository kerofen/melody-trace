"""
全楽器の音声ファイルを新規生成する。
方式: ElevenLabs API（Sound Effects）で各楽器のベース音を生成 → ffmpegでピッチシフト展開

使い方:
  python generate_sounds.py                    # 全楽器生成
  python generate_sounds.py --instrument piano # 特定楽器のみ
  python generate_sounds.py --dry-run          # 生成予定ファイル一覧表示
  python generate_sounds.py --list             # 楽器一覧表示
  python generate_sounds.py --force            # 既存ファイルを再生成

必要な環境:
  - Python 3.8+
  - pip install elevenlabs python-dotenv
  - ffmpeg がパスに通っていること
  - .env に ELEVENLABS_API_KEY を設定
"""

import argparse
import os
import subprocess
import sys
import time

from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

# ============================================================
# 半音階ユーティリティ（config.js と同等）
# ============================================================

CHROMATIC = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

# 周波数テーブル（A4 = 440Hz 基準）
A4_FREQ = 440.0
A4_SEMITONE = 4 * 12 + 9  # A4 の半音番号


def note_to_semitone(note_id):
    """音階ID → 半音番号（C0 = 0）"""
    # 'C4' → ('C', 4), 'Fs5' → ('Fs', 5)
    name = note_id.rstrip('0123456789')
    octave = int(note_id[len(name):])
    idx = CHROMATIC.index(name)
    return octave * 12 + idx


def semitone_to_note(semitone):
    """半音番号 → 音階ID"""
    octave = semitone // 12
    idx = semitone % 12
    return f"{CHROMATIC[idx]}{octave}"


def note_to_freq(note_id):
    """音階ID → 周波数 (Hz)"""
    semi = note_to_semitone(note_id)
    return A4_FREQ * (2 ** ((semi - A4_SEMITONE) / 12.0))


def get_notes_in_range(start_note, end_note):
    """範囲内の全音階IDリストを返す"""
    start = note_to_semitone(start_note)
    end = note_to_semitone(end_note)
    return [semitone_to_note(s) for s in range(start, end + 1)]


# ============================================================
# 楽器定義（config.js と同じ内容）
# ============================================================

INSTRUMENTS = {
    'piano':           {'name': 'グランドピアノ',   'range': ('C3', 'C6'),  'category': 'keyboard'},
    'epiano':          {'name': 'エレピ',           'range': ('C3', 'C6'),  'category': 'keyboard'},
    'musicbox':        {'name': 'オルゴール',        'range': ('C4', 'C7'),  'category': 'keyboard'},
    'celesta':         {'name': 'チェレスタ',        'range': ('C4', 'C7'),  'category': 'keyboard'},
    'violin':          {'name': 'バイオリン',        'range': ('G3', 'E7'),  'category': 'strings'},
    'cello':           {'name': 'チェロ',           'range': ('C2', 'C5'),  'category': 'strings'},
    'acoustic_guitar': {'name': 'アコギ',           'range': ('E2', 'E5'),  'category': 'strings'},
    'electric_guitar': {'name': 'エレキギター',      'range': ('E2', 'E5'),  'category': 'strings'},
    'ukulele':         {'name': 'ウクレレ',          'range': ('C4', 'A6'),  'category': 'strings'},
    'flute':           {'name': 'フルート',          'range': ('C4', 'C7'),  'category': 'wind'},
    'clarinet':        {'name': 'クラリネット',      'range': ('E3', 'C7'),  'category': 'wind'},
    'saxophone':       {'name': 'サックス',          'range': ('As3', 'F6'), 'category': 'wind'},
    'trumpet':         {'name': 'トランペット',      'range': ('E3', 'C6'),  'category': 'wind'},
    'recorder':        {'name': 'リコーダー',        'range': ('C5', 'D7'),  'category': 'wind'},
    'ocarina':         {'name': 'オカリナ',          'range': ('C4', 'F6'),  'category': 'wind'},
    'vocal_ah_female': {'name': '女性スキャット',    'range': ('C4', 'C6'),  'category': 'vocal'},
    'vocal_oh_male':   {'name': '男性スキャット',    'range': ('C3', 'C5'),  'category': 'vocal'},
    'choir_ooh':       {'name': '合唱',             'range': ('C3', 'C6'),  'category': 'vocal'},
    'marimba':         {'name': 'マリンバ',          'range': ('C3', 'C7'),  'category': 'mallet'},
    'glockenspiel':    {'name': '鉄琴',             'range': ('C5', 'C8'),  'category': 'mallet'},
    'vibraphone':      {'name': 'ビブラフォン',      'range': ('F3', 'F6'),  'category': 'mallet'},
    'steel_drum':      {'name': 'スチールドラム',    'range': ('C4', 'C6'),  'category': 'mallet'},
    'synth_8bit':      {'name': '8bit',             'range': ('C3', 'C6'),  'category': 'synth'},
    'synth_lead':      {'name': 'シンセリード',      'range': ('C3', 'C6'),  'category': 'synth'},
    'synth_pad':       {'name': 'シンセパッド',      'range': ('C3', 'C6'),  'category': 'synth'},
    'shamisen':        {'name': '三味線',            'range': ('C3', 'C6'),  'category': 'world'},
    'koto':            {'name': '琴',               'range': ('C3', 'C6'),  'category': 'world'},
    'erhu':            {'name': '二胡',              'range': ('D4', 'D7'),  'category': 'world'},
    'panflute':        {'name': 'パンフルート',      'range': ('C4', 'C7'),  'category': 'world'},
    'kalimba':         {'name': 'カリンバ',          'range': ('C4', 'C6'),  'category': 'world'},
}

# ============================================================
# 楽器ごとの ElevenLabs プロンプト定義
# 基準音（C4付近）の単音を生成するためのプロンプト
# ============================================================

INSTRUMENT_PROMPTS = {
    'piano':           "Single grand piano note, middle C, C4, 261Hz, crisp and clean, short 1.5s, high-quality professionally recorded piano sound effect",
    'epiano':          "Single electric piano Rhodes note, middle C, C4, 261Hz, warm bell-like tone, short 1.5s, high-quality sound effect",
    'musicbox':        "Single music box note, C5, 523Hz, delicate tinkling, short 1.5s, high-quality sound effect",
    'celesta':         "Single celesta note, C5, 523Hz, sparkling bell-like crystalline, short 1.5s, high-quality sound effect",
    'violin':          "Single violin note, G4, 392Hz, sustained warm bowed string, short 1.5s, high-quality sound effect",
    'cello':           "Single cello note, C3, 131Hz, deep rich bowed string, short 1.5s, high-quality sound effect",
    'acoustic_guitar': "Single acoustic guitar pluck note, E3, 165Hz, warm nylon string, short 1.5s, high-quality sound effect",
    'electric_guitar': "Single clean electric guitar note, E3, 165Hz, bright clean tone, short 1.5s, high-quality sound effect",
    'ukulele':         "Single ukulele pluck note, C4, 261Hz, bright cheerful, short 1.5s, high-quality sound effect",
    'flute':           "Single flute note, C5, 523Hz, clear and airy, short 1.5s, high-quality professionally recorded sound effect",
    'clarinet':        "Single clarinet note, G4, 392Hz, warm woody mellow, short 1.5s, high-quality sound effect",
    'saxophone':       "Single alto saxophone note, C4, 261Hz, smooth warm jazzy, short 1.5s, high-quality sound effect",
    'trumpet':         "Single trumpet note, G4, 392Hz, bright brassy, short 1.5s, high-quality sound effect",
    'recorder':        "Single soprano recorder note, C5, 523Hz, gentle airy, short 1.5s, high-quality sound effect",
    'ocarina':         "Single ocarina note, C5, 523Hz, soft breathy ceramic, short 1.5s, high-quality sound effect",
    'vocal_ah_female': "Female soprano vocal ah note, C4, 261Hz, clear pure, short 1.5s, high-quality sound effect",
    'vocal_oh_male':   "Male tenor vocal oh note, C3, 131Hz, warm resonant, short 1.5s, high-quality sound effect",
    'choir_ooh':       "Mixed choir ooh note, C4, 261Hz, lush harmonious, short 1.5s, high-quality sound effect",
    'marimba':         "Single marimba note, C4, 261Hz, warm woody resonant, short 1.5s, high-quality professionally recorded sound effect",
    'glockenspiel':    "Single glockenspiel note, C6, 1047Hz, bright metallic ringing, short 1.5s, high-quality sound effect",
    'vibraphone':      "Single vibraphone note, F4, 349Hz, mellow metallic with vibrato, short 1.5s, high-quality sound effect",
    'steel_drum':      "Single steel drum note, C5, 523Hz, bright tropical metallic, short 1.5s, high-quality sound effect",
    'synth_8bit':      "8-bit chiptune single note, C4, 261Hz, retro square wave, short 1.5s, game sound effect",
    'synth_lead':      "Synthesizer lead single note, C4, 261Hz, bright saw wave, short 1.5s, high-quality sound effect",
    'synth_pad':       "Synthesizer pad single note, C4, 261Hz, lush ambient, short 1.5s, high-quality sound effect",
    'shamisen':        "Single shamisen pluck note, C4, 261Hz, traditional Japanese sharp twangy, short 1.5s, high-quality sound effect",
    'koto':            "Single Japanese koto pluck note, C4, 261Hz, traditional elegant, short 1.5s, high-quality sound effect",
    'erhu':            "Single erhu note, D4, 294Hz, Chinese two-string bowed, expressive, short 1.5s, high-quality sound effect",
    'panflute':        "Single pan flute note, C5, 523Hz, soft breathy Andean, short 1.5s, high-quality sound effect",
    'kalimba':         "Single kalimba thumb piano note, C5, 523Hz, bright tinkling African, short 1.5s, high-quality sound effect",
}

# 各楽器の基準音（プロンプトで指定した音高。ピッチシフトの基準になる）
INSTRUMENT_BASE_NOTES = {
    'piano':           'C4',
    'epiano':          'C4',
    'musicbox':        'C5',
    'celesta':         'C5',
    'violin':          'G4',
    'cello':           'C3',
    'acoustic_guitar': 'E3',
    'electric_guitar': 'E3',
    'ukulele':         'C4',
    'flute':           'C5',
    'clarinet':        'G4',
    'saxophone':       'C4',
    'trumpet':         'G4',
    'recorder':        'C5',
    'ocarina':         'C5',
    'vocal_ah_female': 'C4',
    'vocal_oh_male':   'C3',
    'choir_ooh':       'C4',
    'marimba':         'C4',
    'glockenspiel':    'C6',
    'vibraphone':      'F4',
    'steel_drum':      'C5',
    'synth_8bit':      'C4',
    'synth_lead':      'C4',
    'synth_pad':       'C4',
    'shamisen':        'C4',
    'koto':            'C4',
    'erhu':            'D4',
    'panflute':        'C5',
    'kalimba':         'C5',
}

# ============================================================
# 出力設定
# ============================================================

OUTPUT_BASE = "assets/se"
SAMPLE_RATE = 44100


# ============================================================
# ffmpeg ピッチシフト
# ============================================================

def pitch_shift(source_path, output_path, semitones):
    """
    ffmpegでピッチシフト（asetrate + aresample + atempo で音程変更＆長さ維持）
    
    Args:
        source_path: 入力ファイルパス
        output_path: 出力ファイルパス
        semitones: 半音数（正: 上、負: 下）
    
    Returns:
        bool: 成功時 True
    """
    if semitones == 0:
        # ピッチシフトなし → そのままコピー
        import shutil
        shutil.copy2(source_path, output_path)
        return True
    
    ratio = 2 ** (semitones / 12.0)
    new_rate = int(SAMPLE_RATE * ratio)
    
    # atempoは0.5〜100.0の範囲なので、大きな変更はチェーンする
    atempo_filters = []
    remaining = ratio
    while remaining > 2.0:
        atempo_filters.append("atempo=2.0")
        remaining /= 2.0
    while remaining < 0.5:
        atempo_filters.append("atempo=0.5")
        remaining *= 2.0
    atempo_filters.append(f"atempo={remaining:.6f}")
    
    atempo_chain = ",".join(atempo_filters)
    filter_complex = f"asetrate={new_rate},aresample={SAMPLE_RATE},{atempo_chain}"
    
    cmd = [
        "ffmpeg", "-y",
        "-i", source_path,
        "-af", filter_complex,
        "-b:a", "192k",
        output_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    ffmpeg ERROR: {result.stderr[:300]}")
        return False
    return True


# ============================================================
# ElevenLabs API でベース音を生成
# ============================================================

def generate_base_note(client, instrument_id, output_path):
    """
    ElevenLabs Sound Effects API で楽器のベース音を生成
    
    Args:
        client: ElevenLabs client
        instrument_id: 楽器ID
        output_path: 出力ファイルパス
    
    Returns:
        bool: 成功時 True
    """
    prompt = INSTRUMENT_PROMPTS[instrument_id]
    print(f"  ElevenLabs API 呼び出し中...")
    print(f"  Prompt: {prompt}")
    
    try:
        audio = client.text_to_sound_effects.convert(
            text=prompt,
            duration_seconds=2.0,
            prompt_influence=0.8,
        )
        
        with open(output_path, "wb") as f:
            for chunk in audio:
                f.write(chunk)
        
        file_size = os.path.getsize(output_path)
        print(f"  OK: {output_path} ({file_size:,} bytes)")
        return True
        
    except Exception as e:
        print(f"  API ERROR: {e}")
        return False


# ============================================================
# 楽器の全音を生成
# ============================================================

def generate_instrument(client, instrument_id, force=False):
    """
    1つの楽器の全音声ファイルを生成
    
    1. 基準音を ElevenLabs で生成
    2. ffmpeg でピッチシフトして全音域を生成
    
    Args:
        client: ElevenLabs client (None if dry-run)
        instrument_id: 楽器ID
        force: 既存ファイルも再生成するか
    
    Returns:
        tuple: (成功数, 失敗数, スキップ数)
    """
    inst = INSTRUMENTS[instrument_id]
    base_note = INSTRUMENT_BASE_NOTES[instrument_id]
    notes = get_notes_in_range(inst['range'][0], inst['range'][1])
    
    output_dir = os.path.join(OUTPUT_BASE, instrument_id)
    os.makedirs(output_dir, exist_ok=True)
    
    base_semitone = note_to_semitone(base_note)
    base_path = os.path.join(output_dir, f"_base_{base_note}.mp3")
    
    success = 0
    fail = 0
    skip = 0
    
    # Step 1: 基準音を生成（ElevenLabs）
    if not force and os.path.exists(base_path) and os.path.getsize(base_path) > 0:
        print(f"  基準音 {base_note} は既に存在 → スキップ")
    else:
        if client is None:
            print(f"  [DRY-RUN] 基準音 {base_note} を ElevenLabs で生成予定")
        else:
            ok = generate_base_note(client, instrument_id, base_path)
            if not ok:
                print(f"  基準音の生成に失敗しました。この楽器をスキップします。")
                return (0, len(notes), 0)
            # API rate limit 対策
            time.sleep(1.5)
    
    # Step 2: ピッチシフトで全音域を生成
    for note_id in notes:
        output_path = os.path.join(output_dir, f"{note_id}.mp3")
        semitones = note_to_semitone(note_id) - base_semitone
        
        if not force and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            skip += 1
            continue
        
        if client is None:
            # dry-run
            freq = note_to_freq(note_id)
            print(f"  [DRY-RUN] {note_id}.mp3 ({freq:.0f}Hz, {semitones:+d}半音)")
            success += 1
            continue
        
        print(f"  生成中: {note_id}.mp3 ({semitones:+d}半音)")
        
        ok = pitch_shift(base_path, output_path, semitones)
        if ok:
            size = os.path.getsize(output_path)
            print(f"    OK: {size:,} bytes")
            success += 1
        else:
            print(f"    FAILED")
            fail += 1
    
    return (success, fail, skip)


# ============================================================
# メイン処理
# ============================================================

def list_instruments():
    """楽器一覧を表示"""
    print("=" * 70)
    print(f"{'ID':<20} {'名前':<16} {'カテゴリ':<10} {'音域':<12} {'音数'}")
    print("=" * 70)
    
    total_notes = 0
    for inst_id, inst in INSTRUMENTS.items():
        notes = get_notes_in_range(inst['range'][0], inst['range'][1])
        total_notes += len(notes)
        print(f"{inst_id:<20} {inst['name']:<16} {inst['category']:<10} {inst['range'][0]}-{inst['range'][1]:<8} {len(notes)}")
    
    print("=" * 70)
    print(f"合計: {len(INSTRUMENTS)} 楽器, {total_notes} 音")


def main():
    parser = argparse.ArgumentParser(
        description="全楽器の音声ファイルを ElevenLabs + ffmpeg で生成する"
    )
    parser.add_argument(
        '--instrument', '-i',
        help='特定の楽器のみ生成（楽器ID）'
    )
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='生成予定のファイル一覧を表示（実際には生成しない）'
    )
    parser.add_argument(
        '--list', '-l',
        action='store_true',
        help='楽器一覧を表示'
    )
    parser.add_argument(
        '--force', '-f',
        action='store_true',
        help='既存ファイルも再生成する'
    )
    
    args = parser.parse_args()
    
    # 楽器一覧表示
    if args.list:
        list_instruments()
        return
    
    # 対象楽器の決定
    if args.instrument:
        if args.instrument not in INSTRUMENTS:
            print(f"ERROR: 不明な楽器ID '{args.instrument}'")
            print(f"利用可能な楽器: {', '.join(INSTRUMENTS.keys())}")
            sys.exit(1)
        target_instruments = [args.instrument]
    else:
        target_instruments = list(INSTRUMENTS.keys())
    
    # ElevenLabs クライアント初期化
    client = None
    if not args.dry_run:
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            print("ERROR: ELEVENLABS_API_KEY が .env に設定されていません")
            sys.exit(1)
        
        # ffmpeg の存在確認
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        except (FileNotFoundError, subprocess.CalledProcessError):
            print("ERROR: ffmpeg が見つかりません。インストールしてパスに追加してください。")
            sys.exit(1)
        
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=api_key)
    
    # 生成開始
    total_success = 0
    total_fail = 0
    total_skip = 0
    
    print("=" * 60)
    print(f"Melody Trace サウンド生成")
    print(f"対象: {len(target_instruments)} 楽器")
    if args.dry_run:
        print("[DRY-RUN モード]")
    if args.force:
        print("[FORCE モード: 既存ファイルも再生成]")
    print("=" * 60)
    
    for i, inst_id in enumerate(target_instruments):
        inst = INSTRUMENTS[inst_id]
        notes = get_notes_in_range(inst['range'][0], inst['range'][1])
        
        print(f"\n[{i+1}/{len(target_instruments)}] {inst_id} ({inst['name']}) "
              f"- {inst['range'][0]}〜{inst['range'][1]} ({len(notes)}音)")
        print("-" * 40)
        
        success, fail, skip = generate_instrument(client, inst_id, force=args.force)
        total_success += success
        total_fail += fail
        total_skip += skip
        
        if skip > 0:
            print(f"  スキップ: {skip} 音（既に存在）")
    
    # サマリー
    print(f"\n{'=' * 60}")
    print(f"完了!")
    print(f"  成功: {total_success}")
    print(f"  失敗: {total_fail}")
    print(f"  スキップ: {total_skip}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
