# Mój Domek 🏠

Gra na telefon dla dziecka w wieku ok. 6 lat, w stylu Logic Like. Dziecko idzie ze swoim zwierzakiem ścieżką przez krainy. Każde kółko na mapie to krótki poziom (5 zadań) z angielskiego, matematyki albo logiki. Poziomy są coraz trudniejsze, a za każdy dziecko dostaje 1–3 gwiazdki i smakołyki dla zwierzaka. Nie trzeba umieć czytać: polecenia są mówione na głos.

## Przebieg gry

1. Wybór postaci (24) i zwierzaka (16).
2. **Mapa krainy:** ścieżka kółek od dołu do góry. Każde kółko to lekcja.
3. **Lekcja w trzech krokach** (widać je u góry ekranu):
   - 📖 **Nauka:** obrazek i lektor mówi słówko (dwa razy, bez tłumaczenia). Potem ćwiczenie z podpowiedzią, w którym błąd od razu pokazuje dobrą odpowiedź. W matematyce pokaz: liczymy razem, łączymy w pary, ramka na dziesięć, „część i część to całość”.
   - 🎮 **Gra-test:** 5 zadań z tego, czego dziecko się nauczyło, plus powtórka słówek, które sprawiały trudność. Gwiazdki zależą od liczby pomyłek: 0–1 to ⭐⭐⭐, 2–3 to ⭐⭐, więcej to ⭐.
   - 🍬 **Nagroda** (tylko za 2–3 gwiazdki): krótka gra w stylu Candy Crush, 10 ruchów, w której dziecko zdobywa smakołyki dla zwierzaka. Za 1 gwiazdkę gra proponuje powtórkę lekcji, a następna próba jest łatwiejsza.
4. 🎁 **Skrzynka w połowie krainy:** ozdoba dla zwierzaka.
5. 🦉 **Sowa na końcu krainy:** sprawdzian z całej krainy. Nagrodą są cukierki, nowy zwierzak, ozdoba i następna kraina.
6. **Domek zwierzaka** (duży przycisk na mapie): karmienie smakołykami i przebieranie.

| Kraina | Angielski | Matematyka i logika |
|---|---|---|
| 🏠 Domek | jedzenie (10 słówek) | liczby 1–3, liczenie po kolei, więcej i mniej, wzór AB |
| 🌻 Ogród | zwierzęta, kolory, kształty | liczby 4–5, szybkie rozpoznawanie kropek, co nie pasuje |
| 🏖️ Plaża | morze i plaża, kolejne kolory | ramka na dziesięć (6–10), dodawanie do 5, rozmiary, wzory ABC i ABB |
| 🌲 Las | las | odejmowanie, dodawanie do 10 (liczenie dalej), mniej i więcej do 10, wzór AAB |
| 🏰 Zamek | zamek i kosmos, kształty | ile brakuje do 10, odejmowanie do 10, wzór AABB |

## Na czym opiera się nauka

- **Słówka:** obrazek i głos lektora zamiast tłumaczenia. Najpierw słuchanie i pokazywanie, bez presji mówienia, bo to zmniejsza stres u małych dzieci. 3–5 nowych słów na lekcję.
- **Powtórki rozłożone w czasie:** każde słówko ma swoje „pudełko” jak w fiszkach. Błąd cofa je na początek, a najsłabsze słówka wracają w kolejnych lekcjach i u sowy.
- **Matematyka od konkretu do symbolu:** przedmioty, potem kropki i ramka na dziesięć, potem cyfra. Szybkie rozpoznawanie ilości bez liczenia, liczenie po kolei (jeden dotyk to jedna liczba), łączenie w pary przy porównywaniu, część i część to całość przy dodawaniu i „ile brakuje do 10”.
- **Błąd uczy:** przy liczeniu, dodawaniu i odejmowaniu po pierwszej pomyłce gra liczy razem z dzieckiem. Po drugiej podświetla dobrą odpowiedź. Przy słówkach mówi, co dziecko dotknęło.
- **Trudność dopasowana do dziecka:** po słabym wyniku następna próba ma mniej obrazków i mniejsze liczby. Chodzi o to, żeby dziecko miało około 65–85% dobrych odpowiedzi.
- **Nagrody z umiarem:** cukierki tylko za dobry wynik i tylko 10 ruchów, żeby nagroda była przerwą, a nie powodem do przeklikiwania nauki.

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
