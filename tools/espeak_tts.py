"""Offline synteza mowy przez espeak-ng (pakiet pip: espeakng-loader). Zapisuje WAV."""
import ctypes, wave, sys
import espeakng_loader as E

lib = ctypes.CDLL(E.get_library_path())
_samples = bytearray()
CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)

@CB
def _cb(wav, n, events):
    if wav and n > 0:
        _samples.extend(ctypes.string_at(wav, n * 2))
    return 0

RATE = lib.espeak_Initialize(2, 0, E.get_data_path().encode(), 0)  # 2 = AUDIO_OUTPUT_SYNCHRONOUS
lib.espeak_SetSynthCallback(_cb)

def synth(text, voice, out_wav, speed=145, pitch=60):
    _samples.clear()
    lib.espeak_SetVoiceByName(voice.encode())
    lib.espeak_SetParameter(1, speed, 0)  # espeakRATE
    lib.espeak_SetParameter(3, pitch, 0)  # espeakPITCH
    data = text.encode('utf-8')
    lib.espeak_Synth(data, len(data) + 1, 0, 0, 0, 0x10, None, None)  # 0x10 = espeakCHARS_UTF8
    lib.espeak_Synchronize()
    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(bytes(_samples))

if __name__ == '__main__':
    synth(sys.argv[1], sys.argv[2], sys.argv[3])
