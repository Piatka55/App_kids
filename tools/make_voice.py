"""Nagrywa wszystkie wypowiedzi gry (js/phrases.js) do audio/voice-pack.js.

Użycie:  python3 tools/make_voice.py [--engine neural|espeak]
- neural: naturalni lektorzy Microsoft (pl-PL Zofia, en-US Jenny), pip install edge-tts, wymaga dostępu do speech.platform.bing.com
- espeak: zapasowy syntezator offline, pip install espeakng-loader
Domyślnie próbuje neural, a gdy się nie da, używa espeak. Wymaga też node i ffmpeg."""
import asyncio, base64, hashlib, json, os, subprocess, sys, tempfile
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.voice-cache')
OUT = os.path.join(ROOT, 'audio', 'voice-pack.js')
NEURAL = {'pl': ('pl-PL-ZofiaNeural', '-5%'), 'en': ('en-US-JennyNeural', '-12%')}  # głos, tempo
ESPEAK = {'pl': ('pl+f3', 140, 62), 'en': ('en-us+f3', 125, 62)}
TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
        'silenceremove=start_periods=1:start_threshold=-45dB,areverse')

def clip_path(engine, lang, text):
    h = hashlib.sha1(f'{engine}|{lang}|{text}|{NEURAL[lang] if engine == "neural" else ESPEAK[lang]}'.encode()).hexdigest()[:16]
    return os.path.join(CACHE, f'{engine}-{lang}-{h}.mp3')

def encode(src, out):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', TRIM,
                    '-ac', '1', '-ar', '22050', '-b:a', '40k', out], check=True)

def render_espeak(job):
    lang, text = job
    out = clip_path('espeak', lang, text)
    if os.path.exists(out):
        return out
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import espeak_tts
    voice, speed, pitch = ESPEAK[lang]
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        espeak_tts.synth(text, voice, wav.name, speed, pitch)
        encode(wav.name, out)
    return out

async def render_neural_all(jobs):
    import edge_tts
    proxy = os.environ.get('HTTPS_PROXY') or None
    sem = asyncio.Semaphore(6)
    async def one(lang, text):
        out = clip_path('neural', lang, text)
        if os.path.exists(out):
            return out
        voice, rate = NEURAL[lang]
        async with sem:
            for attempt in range(4):
                try:
                    with tempfile.NamedTemporaryFile(suffix='.mp3') as raw:
                        await edge_tts.Communicate(text, voice, rate=rate, proxy=proxy).save(raw.name)
                        encode(raw.name, out)
                    return out
                except Exception:
                    if attempt == 3:
                        raise
                    await asyncio.sleep(2 ** attempt)
    return await asyncio.gather(*(one(l, t) for l, t in jobs))

def neural_available():
    try:
        asyncio.run(render_neural_all([('pl', 'Cześć!')]))
        return True
    except Exception as e:
        print(f'Naturalny lektor niedostępny ({type(e).__name__}), używam espeak.')
        return False

def main():
    engine = sys.argv[sys.argv.index('--engine') + 1] if '--engine' in sys.argv else None
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    phrases = [tuple(p) for p in json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools', 'list_phrases.js')]))]
    if engine is None:
        engine = 'neural' if neural_available() else 'espeak'
    if engine == 'neural':
        paths = asyncio.run(render_neural_all(phrases))
    else:
        with ProcessPoolExecutor() as ex:
            paths = list(ex.map(render_espeak, phrases, chunksize=8))
    pack = {}
    for (lang, text), path in zip(phrases, paths):
        with open(path, 'rb') as f:
            pack[f'{lang}|{text}'] = base64.b64encode(f.read()).decode()
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* Nagrania głosu, wygenerowane przez tools/make_voice.py. Nie edytuj ręcznie. */\n')
        f.write(f'window.VOICE_PACK_ENGINE = {json.dumps(engine)};\n')
        f.write('window.VOICE_PACK = ')
        json.dump(pack, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f'{engine}: {len(pack)} nagrań, {os.path.getsize(OUT) / 1e6:.1f} MB -> {os.path.relpath(OUT, ROOT)}')

if __name__ == '__main__':
    main()
