"""Nagrywa wszystkie wypowiedzi gry (js/phrases.js) i zapisuje je w audio/voice-pack.js.

Użycie:  python3 tools/make_voice.py
Wymaga:  node, ffmpeg, pip install espeakng-loader
Gotowe nagrania trzyma w tools/.voice-cache, więc ponowne uruchomienie robi tylko nowe teksty."""
import base64, hashlib, json, os, subprocess, sys, tempfile
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.voice-cache')
OUT = os.path.join(ROOT, 'audio', 'voice-pack.js')
VOICES = {'pl': ('pl+f3', 140, 62), 'en': ('en-us+f3', 125, 62)}  # głos, tempo, wysokość
TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
        'silenceremove=start_periods=1:start_threshold=-45dB,areverse')

def clip_path(lang, text):
    v = VOICES[lang]
    h = hashlib.sha1(f'{lang}|{text}|{v}'.encode()).hexdigest()[:16]
    return os.path.join(CACHE, f'{lang}-{h}.mp3')

def render(job):
    lang, text = job
    out = clip_path(lang, text)
    if os.path.exists(out):
        return out
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import espeak_tts
    voice, speed, pitch = VOICES[lang]
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        espeak_tts.synth(text, voice, wav.name, speed, pitch)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav.name, '-af', TRIM,
                        '-ac', '1', '-ar', '16000', '-b:a', '24k', out], check=True)
    return out

def main():
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    phrases = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools', 'list_phrases.js')]))
    with ProcessPoolExecutor() as ex:
        paths = list(ex.map(render, [tuple(p) for p in phrases], chunksize=8))
    pack = {}
    for (lang, text), path in zip(phrases, paths):
        with open(path, 'rb') as f:
            pack[f'{lang}|{text}'] = base64.b64encode(f.read()).decode()
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* Nagrania głosu, wygenerowane przez tools/make_voice.py. Nie edytuj ręcznie. */\n')
        f.write('window.VOICE_PACK = ')
        json.dump(pack, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f'{len(pack)} nagrań, {os.path.getsize(OUT) / 1e6:.1f} MB -> {os.path.relpath(OUT, ROOT)}')

if __name__ == '__main__':
    main()
