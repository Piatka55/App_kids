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


# --- Wysyłanie klawiszy (Windows) --------------------------------------------

# klawisz -> (kod wirtualny VK, kod skanowania, klawisz rozszerzony)
KEY_CODES = {
    "I": (0x49, 0x17, False),
    "K": (0x4B, 0x25, False),
    "A": (0x41, 0x1E, False),
    "D": (0x44, 0x20, False),
    "LEFT": (0x25, 0x4B, True),
    "RIGHT": (0x27, 0x4D, True),
    "UP": (0x26, 0x48, True),
    "DOWN": (0x28, 0x50, True),
}

MYWHOOSH_PROCESSES = ("mywhoosh.exe", "mywhooshhd.exe")

# Gra czyta klawiaturę raz na klatkę, więc zbyt krótkie naciśnięcie może
# przepaść. Tyle trzymamy klawisz.
KEY_HOLD = 0.1  # sekundy


class KeySender:
    """Wysyła klawisze do MyWhoosh.

    Gdy okno MyWhoosh jest na wierzchu, używa SendInput (jak prawdziwa
    klawiatura). Gdy nie jest, wysyła komunikaty prosto do jego okna, więc nie
    trzeba w nie klikać.
    """

    def __init__(self, enabled):
        self.enabled = enabled and sys.platform == "win32"
        self.window = None
        self.warned = False
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

        self._wintypes = wintypes
        self._KEYBDINPUT, self._INPUT = KEYBDINPUT, INPUT
        self._user32 = ctypes.windll.user32
        self._kernel32 = ctypes.windll.kernel32
        self._user32.PostMessageW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
        self._user32.GetForegroundWindow.restype = wintypes.HWND
        self._kernel32.OpenProcess.restype = wintypes.HANDLE

    def _process_name(self, hwnd):
        pid = self._wintypes.DWORD()
        self._user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        handle = self._kernel32.OpenProcess(0x1000, False, pid.value)  # QUERY_LIMITED_INFORMATION
        if not handle:
            return ""
        try:
            buf = ctypes.create_unicode_buffer(1024)
            size = self._wintypes.DWORD(len(buf))
            if self._kernel32.QueryFullProcessImageNameW(handle, 0, buf, ctypes.byref(size)):
                return buf.value.rsplit("\\", 1)[-1].lower()
            return ""
        finally:
            self._kernel32.CloseHandle(handle)

    def find_mywhoosh(self):
        if self.window and self._user32.IsWindow(self.window):
            return self.window
        found = []
        proc_type = ctypes.WINFUNCTYPE(ctypes.c_bool, self._wintypes.HWND, self._wintypes.LPARAM)

        def check(hwnd, _):
            if self._user32.IsWindowVisible(hwnd) and self._process_name(hwnd) in MYWHOOSH_PROCESSES:
                found.append(hwnd)
                return False
            return True

        self._user32.EnumWindows(proc_type(check), 0)
        self.window = found[0] if found else None
        if self.window:
            log("Znalazłem okno MyWhoosh, klawisze pójdą prosto do niego.")
        return self.window

    def _send_input(self, scan, extended, key_up):
        flags = 0x0008  # KEYEVENTF_SCANCODE
        if extended:
            flags |= 0x0001
        if key_up:
            flags |= 0x0002
        inp = self._INPUT(type=1)  # INPUT_KEYBOARD
        inp.u.ki = self._KEYBDINPUT(0, scan, flags, 0, 0)
        if not self._user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(inp)) and not self.warned:
            self.warned = True
            log("Windows zablokował klawisz. Uruchom start.bat jako administrator.")

    def _post(self, hwnd, vk, scan, extended, key_up):
        lparam = 1 | (scan << 16)
        if extended:
            lparam |= 1 << 24
        if key_up:
            lparam |= (1 << 30) | (1 << 31)
        msg = 0x0101 if key_up else 0x0100  # WM_KEYUP / WM_KEYDOWN
        if not self._user32.PostMessageW(hwnd, msg, vk, lparam) and not self.warned:
            self.warned = True
            log("Windows zablokował klawisz. Uruchom start.bat jako administrator.")

    def _key(self, key, key_up):
        vk, scan, extended = KEY_CODES[key]
        hwnd = self.find_mywhoosh()
        if hwnd and self._user32.GetForegroundWindow() != hwnd:
            self._post(hwnd, vk, scan, extended, key_up)
        else:
            self._send_input(scan, extended, key_up)

    def tap(self, key):
        if not self.enabled:
            return
        self._key(key, False)
        try:
            asyncio.get_running_loop().call_later(KEY_HOLD, self._key, key, True)
        except RuntimeError:  # wywołanie spoza pętli asyncio
            time.sleep(KEY_HOLD)
            self._key(key, True)


# --- Połączenie z Clickiem ---------------------------------------------------

def log(msg):
    print(f"{datetime.datetime.now():%H:%M:%S} {msg}", flush=True)


class PressFilter:
    """Odsiewa to samo naciśnięcie zgłoszone przez obie części Clicka.

    Odblokowana lewa część przekazuje też przyciski prawej, więc jedno
    naciśnięcie przychodzi dwa razy z różnych urządzeń w odstępie milisekund.
    """

    WINDOW = 0.3  # sekundy

    def __init__(self):
        self.last = {}  # przycisk -> (adres urządzenia, czas)

    def accept(self, button, address):
        now = time.monotonic()
        prev = self.last.get(button)
        if prev and prev[0] != address and now - prev[1] < self.WINDOW:
            return False
        self.last[button] = (address, now)
        return True


class ClickConnection:
    def __init__(self, device, type_name, keys, presses, debug):
        self.device = device
        self.presses = presses
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
            if not self.presses.accept(button, self.device.address):
                if self.debug:
                    log(f"{self.name} przycisk: {button} (duplikat, pomijam)")
                continue
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


async def keep_connected(device, type_name, keys, presses, debug):
    while True:
        try:
            await ClickConnection(device, type_name, keys, presses, debug).run()
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

    if keys.enabled and not keys.find_mywhoosh():
        log("Nie widzę okna MyWhoosh. Uruchom MyWhoosh albo kliknij w jego okno.")
    presses = PressFilter()
    await asyncio.gather(*(keep_connected(d, t, keys, presses, args.surowe) for d, t in devices))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
