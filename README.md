# Mój Domek 🏠

Gra na telefon dla dziecka w wieku ok. 6 lat, w stylu Logic Like. Dziecko idzie ze swoim zwierzakiem ścieżką przez krainy. Każde kółko na mapie to krótki poziom (5 zadań) z angielskiego, matematyki albo logiki. Poziomy są coraz trudniejsze, a za każdy dziecko dostaje 1–3 gwiazdki i smakołyki dla zwierzaka. Nie trzeba umieć czytać: polecenia są mówione na głos.

## Przebieg gry

1. Wybór postaci (24) i zwierzaka (16).
2. **Mapa krainy:** ścieżka kółek od dołu do góry. Świecące kółko to następny poziom, a zamknięte kółka mają kłódkę.
3. **Poziom:** pasek postępu u góry, zwierzak w rogu cieszy się przy dobrej odpowiedzi. Gwiazdki zależą od liczby pomyłek: 0–1 to ⭐⭐⭐, 2–3 to ⭐⭐, więcej to ⭐.
4. 🎁 **Skrzynka w połowie krainy:** ozdoba dla zwierzaka (kokarda, korona, okulary…).
5. 🦉 **Sowa na końcu krainy:** wyzwanie z mieszanymi zadaniami. Nagrodą jest nowy zwierzak, kolejna ozdoba i następna kraina.
6. **Domek zwierzaka** (duży przycisk w lewym dolnym rogu mapy): karmienie smakołykami, przebieranie w ozdoby, zmiana zwierzaka.

| Kraina | Angielski | Matematyka i logika |
|---|---|---|
| 🏠 Domek | jedzenie, liczby 1–3 | liczenie do 4, dawanie N, więcej, wzór AB, memory |
| 🌻 Ogród | zwierzęta, kolory, kształty, liczby do 5 | liczenie do 7, co nie pasuje, wzór ABB |
| 🏖️ Plaża | morze i plaża, kolory | dodawanie do 5, rozmiary, mniej i więcej do 10, wzór ABC |
| 🌲 Las | las, liczby do 9 | odejmowanie, dodawanie do 8, wzór AAB, kształty |
| 🏰 Zamek | zamek i kosmos, liczby do 10 | dodawanie i odejmowanie do 10, wzór AABB |

Rodzaje zadań: posłuchaj i dotknij obrazka, kolory (baloniki), kształty, liczby po angielsku (kropki), memory, ile jest, nakarm N, gdzie więcej/mniej, największy/najmniejszy, co dalej (wzory), co nie pasuje, dodawanie, odejmowanie (kilka ucieka). Wszystko jest opisane w `js/data.js`, więc łatwo dodać poziomy i krainy.

## Głos

- **Automatycznie** gra używa naturalnych głosów telefonu: polskiego i angielskiego w Chrome (Android) i Safari (iPhone). Brzmią naturalnie, jak lektor.
- Gdy telefon ich nie ma albo milczą (np. w aplikacji Claude), gra przełącza się na nagrania z `audio/voice-pack.js`.
- Nagrania tworzy `python3 tools/make_voice.py`. Najpierw próbuje naturalnych lektorów Microsoft (pl-PL Zofia, en-US Jenny; wymaga `pip install edge-tts` i dostępu do `speech.platform.bing.com`). Gdy ich nie ma, używa zapasowego syntezatora espeak. Paczka z naturalnym lektorem ma pierwszeństwo przed głosem telefonu.

Wszystkie teksty mówione są w `js/phrases.js`.

## Panel rodzica

Przytrzymaj ⚙️ (prawy dolny róg mapy) przez 1,5 sekundy. Panel pokazuje postęp w krainach. Można tam wybrać głos (automatycznie, głos telefonu albo nagrania), odblokować wszystkie krainy i wyczyścić postęp.

## Uruchomienie

To zwykła strona internetowa (PWA).

- **Lokalnie:** `python3 -m http.server 8000` i adres `http://localhost:8000`.
- **Na telefonie (zalecane):** GitHub → *Settings → Pages → Deploy from branch*, a potem otwórz `https://piatka55.github.io/App_kids/` w Chrome lub Safari i wybierz „Dodaj do ekranu głównego”. Gra działa wtedy jak aplikacja, także bez internetu, i mówi naturalnymi głosami telefonu.

## Pliki

- `js/data.js`: postacie, zwierzaki, ozdoby, słówka, krainy i poziomy
- `js/phrases.js`: wszystko, co gra mówi
- `js/game.js`: logika gry (mapa, zadania, nagrody, głos)
- `css/style.css`: wygląd
- `audio/voice-pack.js`: nagrania (generowane), `tools/`: generator nagrań
- `sw.js`, `manifest.webmanifest`, `icons/`: instalacja na telefonie i tryb offline
