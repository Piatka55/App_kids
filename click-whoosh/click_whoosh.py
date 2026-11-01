"""Click Whoosh: Zwift Click V2 -> klawisze MyWhoosh (Windows).

Program łączy się z Clickiem przez Bluetooth LE, odczytuje wciśnięcia
przycisków i wysyła do okna MyWhoosh naciśnięcia klawiszy (K = bieg w górę, czyli ciężej,
I = bieg w dół, czyli lżej, zgodnie ze skrótami MyWhoosh).

Uruchomienie:  python click_whoosh.py            (sterowanie MyWhoosh)
               python click_whoosh.py --tylko-log (tylko pokazuje przyciski)
"""

import argparse
import asyncio
import ctypes
import datetime
import sys
import time

from bleak import BleakClient, BleakScanner

# --- Protokół Zwift (BLE) ---------------------------------------------------

ZWIFT_SERVICE = "00000001-19ca-4651-86e5-fa29dcdd09d1"
ASYNC_CHAR = "00000002-19ca-4651-86e5-fa29dcdd09d1"    # powiadomienia z przyciskami
SYNC_RX_CHAR = "00000003-19ca-4651-86e5-fa29dcdd09d1"  # zapis: komendy do Clicka
SYNC_TX_CHAR = "00000004-19ca-4651-86e5-fa29dcdd09d1"  # odpowiedzi z Clicka
ZWIFT_MANUFACTURER_ID = 0x094A

RIDE_ON = b"RideOn"

DEVICE_TYPES = {
    0x09: "Click V1",
    0x0A: "Click V2 (prawy)",
    0x0B: "Click V2 (lewy)",
    0x02: "Play (prawy)",
    0x03: "Play (lewy)",
    0x07: "Ride (prawy)",
    0x08: "Ride (lewy)",
}

# Typy wiadomości (pierwszy bajt ramki).
MSG_RIDE_BUTTONS = 0x23   # Click V2 / Ride: protobuf z maską przycisków
MSG_CLICK_V1 = 0x37       # Click V1: dwa pola, plus i minus
MSG_BATTERY = 0x19
MSG_EMPTY = 0x15

# Maska przycisków Click V2 / Ride. Bit 0 oznacza wciśnięty.
BUTTON_BITS = {
    "lewo": 0x1,
    "gora": 0x2,
    "prawo": 0x4,
    "dol": 0x8,
    "A": 0x10,
    "B": 0x20,
    "Y": 0x40,
    "Z": 0x100,
    "minus": 0x200,   # lewy puck, przycisk pod krzyżakiem
    "plus": 0x2000,   # prawy puck, przycisk pod B
}

# --- Przypisanie przycisków do akcji w MyWhoosh ------------------------------

# Prawy puck działa zawsze, lewy dopiero po „odblokowaniu” w aplikacji Zwift,
# dlatego zmiana biegów jest też pod Y i B.
MAPPING = {
    "plus": "K",    # bieg w górę (ciężej) w MyWhoosh
    "Y": "K",
    "minus": "I",   # bieg w dół (lżej) w MyWhoosh
    "B": "I",
    "lewo": "LEFT",
    "prawo": "RIGHT",
    "gora": "UP",
    "dol": "DOWN",
}


# --- Dekodowanie ramek -------------------------------------------------------

def read_varint(data, pos):
    result = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        pos += 1
        result |= (b & 0x7F) << shift
        if not b & 0x80:
            return result, pos
        shift += 7
    raise ValueError("ucięty varint")


def parse_protobuf_varints(data):
    """Zwraca {numer_pola: wartość} dla pól typu varint, resztę pomija."""
    fields = {}
    pos = 0
    while pos < len(data):
        key, pos = read_varint(data, pos)
        field, wire = key >> 3, key & 0x7
        if wire == 0:
            fields[field], pos = read_varint(data, pos)
        elif wire == 2:
            length, pos = read_varint(data, pos)
            pos += length
        elif wire == 5:
            pos += 4
        elif wire == 1:
            pos += 8
        else:
            break
    return fields


def pressed_buttons(frame):
    """Zwraca zbiór wciśniętych przycisków albo None, jeśli to nie ramka z przyciskami."""
    if not frame:
        return None
    kind, body = frame[0], bytes(frame[1:])
    if kind == MSG_RIDE_BUTTONS:
        mask = parse_protobuf_varints(body).get(1)
        if mask is None:
            return None
        return {name for name, bit in BUTTON_BITS.items() if mask & bit == 0}
    if kind == MSG_CLICK_V1:
        fields = parse_protobuf_varints(body)
        result = set()
        if fields.get(1) == 0:
            result.add("plus")
        if fields.get(2) == 0:
            result.add("minus")
        return result
    return None


# --- Wysyłanie klawiszy (Windows SendInput, kody skanowania) -----------------

SCAN_CODES = {
    "I": (0x17, False),
    "K": (0x25, False),
    "A": (0x1E, False),
    "D": (0x20, False),
    "LEFT": (0x4B, True),
    "RIGHT": (0x4D, True),
    "UP": (0x48, True),
    "DOWN": (0x50, True),
}


class KeySender:
    def __init__(self, enabled):
        self.enabled = enabled and sys.platform == "win32"
        if not self.enabled:
            return
        from ctypes import wintypes

        class KEYBDINPUT(ctypes.Structure):
            _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD),
                        ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD),
                        ("dwExtraInfo", ctypes.c_size_t)]

        class _U(ctypes.Union):
            # MOUSEINPUT jest największy w unii; bufor trzyma właściwy rozmiar.
            _fields_ = [("ki", KEYBDINPUT), ("pad", ctypes.c_byte * 32)]

        class INPUT(ctypes.Structure):
            _fields_ = [("type", wintypes.DWORD), ("u", _U)]

        self._KEYBDINPUT, self._INPUT = KEYBDINPUT, INPUT
        self._send = ctypes.windll.user32.SendInput

    def _event(self, scan, extended, key_up):
        flags = 0x0008  # KEYEVENTF_SCANCODE
        if extended:
            flags |= 0x0001
        if key_up:
            flags |= 0x0002
        inp = self._INPUT(type=1)  # INPUT_KEYBOARD
        inp.u.ki = self._KEYBDINPUT(0, scan, flags, 0, 0)
        self._send(1, ctypes.byref(inp), ctypes.sizeof(inp))

    def tap(self, key):
        if not self.enabled:
            return
        scan, extended = SCAN_CODES[key]
        self._event(scan, extended, False)
        time.sleep(0.03)
        self._event(scan, extended, True)


# --- Połączenie z Clickiem ---------------------------------------------------

def log(msg):
    print(f"{datetime.datetime.now():%H:%M:%S} {msg}", flush=True)


class ClickConnection:
    def __init__(self, device, type_name, keys, debug):
        self.device = device
        self.name = f"{type_name} [{device.address}]"
        self.keys = keys
        self.debug = debug
        self.held = set()
        self.disconnected = asyncio.Event()

    def on_async(self, _sender, data):
        if self.debug:
            log(f"{self.name} dane: {data.hex(' ')}")
        buttons = pressed_buttons(data)
        if buttons is None:
            if data and data[0] == MSG_BATTERY and len(data) > 1:
                fields = parse_protobuf_varints(bytes(data[1:]))
                if 1 in fields:
                    log(f"{self.name} bateria: {fields[1]}%")
            return
        new = buttons - self.held
        self.held = buttons
        for button in sorted(new):
            key = MAPPING.get(button)
            log(f"{self.name} przycisk: {button}" + (f" -> klawisz {key}" if key else ""))
            if key:
                self.keys.tap(key)

    def on_sync(self, _sender, data):
        if data.startswith(RIDE_ON):
            log(f"{self.name} uzgodnienie OK ({data[len(RIDE_ON):].hex(' ') or 'brak danych'})")
        elif self.debug:
            log(f"{self.name} odpowiedź: {data.hex(' ')}")

    async def run(self):
        log(f"Łączę z {self.name}...")
        async with BleakClient(self.device, disconnected_callback=lambda _c: self.disconnected.set()) as client:
            await client.start_notify(ASYNC_CHAR, self.on_async)
            await client.start_notify(SYNC_TX_CHAR, self.on_sync)
            await client.write_gatt_char(SYNC_RX_CHAR, RIDE_ON, response=True)
            log(f"{self.name} połączony. Naciskaj przyciski.")
            await self.disconnected.wait()
        log(f"{self.name} rozłączony.")


async def find_zwift_devices(timeout):
    found = await BleakScanner.discover(timeout=timeout, return_adv=True)
    result = []
    for device, adv in found.values():
        data = adv.manufacturer_data.get(ZWIFT_MANUFACTURER_ID)
        if data is None and ZWIFT_SERVICE not in [u.lower() for u in adv.service_uuids]:
            continue
        type_id = data[0] if data else None
        type_name = DEVICE_TYPES.get(type_id, f"Zwift (typ {type_id})")
        result.append((device, type_name))
    return result


async def keep_connected(device, type_name, keys, debug):
    while True:
        try:
            await ClickConnection(device, type_name, keys, debug).run()
        except Exception as e:  # BLE na Windows potrafi zgłaszać różne błędy
            log(f"{type_name}: błąd połączenia: {e}")
        log("Ponawiam za 3 s (naciśnij przycisk na Clicku, żeby go wybudzić)...")
        await asyncio.sleep(3)
        fresh = await BleakScanner.find_device_by_address(device.address, timeout=10)
        if fresh:
            device = fresh


async def main():
    parser = argparse.ArgumentParser(description="Zwift Click V2 -> MyWhoosh")
    parser.add_argument("--tylko-log", action="store_true", help="nie wysyłaj klawiszy, tylko pokazuj przyciski")
    parser.add_argument("--surowe", action="store_true", help="pokazuj surowe dane z Clicka (do diagnozy)")
    args = parser.parse_args()

    keys = KeySender(enabled=not args.tylko_log)
    if not args.tylko_log and not keys.enabled:
        log("Uwaga: wysyłanie klawiszy działa tylko na Windows, tu będzie tylko log.")

    log("Szukam urządzeń Zwift. Naciśnij przycisk na obu częściach Clicka...")
    devices = []
    while not devices:
        devices = await find_zwift_devices(timeout=8)
        if not devices:
            log("Nic nie znalazłem, szukam dalej...")
    for device, type_name in devices:
        log(f"Znaleziono: {type_name} [{device.address}] {device.name or ''}")

    if not args.tylko_log:
        log("Kliknij teraz w okno MyWhoosh, żeby klawisze do niego trafiały.")
    await asyncio.gather(*(keep_connected(d, t, keys, args.surowe) for d, t in devices))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
