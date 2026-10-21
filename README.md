# Mój Domek 🏠

Gra na telefon dla dziecka w wieku ok. 6 lat. Dziecko chodzi swoją postacią po domku, otwiera szafki i opiekuje się zwierzątkiem, a przy okazji uczy się angielskiego i matematyki. Wszystko jest czytane na głos, więc nie trzeba umieć czytać.

## Jak się gra

1. **Wybór postaci**: 24 postacie (księżniczka, wróżka, syrenka, robot, smok, panda…). Postać można zmienić w każdej chwili, dotykając jej obrazka w lewym górnym rogu.
2. **Chodzenie**: dotknij podłogi, a postać tam pójdzie. Dotknij mebla, a postać do niego podejdzie i go otworzy.
3. **Szafki i półki**: po otwarciu głos mówi nazwę po polsku i po angielsku („Lodówka. Po angielsku: fridge”). Każdą rzecz w środku też można dotknąć i posłuchać.
4. **Trzy gwiazdki w każdym pokoju**:
   - 🔍 otwórz wszystkie meble,
   - 🦜 **papuga** (ABC): mówi słowo po angielsku, dziecko pokazuje obrazek,
   - 🐙 **ośmiornica** (123): matematyka.
5. 🦉 **Sowa**: test z 6 pytań (3 z angielskiego i 3 z matematyki). Do zaliczenia trzeba 5 dobrych odpowiedzi.
6. **Nagroda**: odznaka i prezent 🎁, czyli nowe zwierzątko do wyboru spośród 16. Otwierają się też drzwi do następnego pokoju.
7. **Opieka**: po 4 godzinach zwierzątko jest głodne (🍽️). Karmi się je przy misce w kuchni, odliczając jedzenie („Daj kotkowi tyle rybek: trzy”).

Gdy dziecko nic nie robi przez chwilę, pojawia się palec 👇 pokazujący, co zrobić dalej, i głos z podpowiedzią. Za błąd nie ma kary: przy błędnej odpowiedzi gra mówi „Spróbuj jeszcze raz”, a po drugim błędzie podświetla dobrą odpowiedź.

| Pokój | Angielski | Matematyka |
|---|---|---|
| 🍳 Kuchnia | jedzenie, naczynia, okno | liczenie do 5 (wkładanie do miski) |
| 🧼 Łazienka | części ciała, kolory, łazienka | liczenie do 10, więcej i mniej |
| 🧸 Sypialnia | ubrania, zabawki, przybory | dodawanie do 6 |

## Panel rodzica

**Przytrzymaj ⚙️ przez 1,5 sekundy.** Panel pokazuje gwiazdki, odznaki, wyniki testów i liczbę usłyszanych słówek. Można tam przełączyć głos (nagrany lub telefonu), sprawdzić głos i wyczyścić postęp.

## Głos

Gra mówi z **gotowych nagrań** zapisanych w `audio/voice-pack.js`. Dzięki temu działa w każdym telefonie, w aplikacji Claude i bez internetu, bez żadnych ustawień. W panelu rodzica można przełączyć na głos telefonu. Brzmi ładniej, ale nie działa w każdej aplikacji.

Wszystkie teksty, które gra mówi, są w `js/phrases.js`. Po zmianie tekstów trzeba wygenerować nagrania na nowo:

```
pip install espeakng-loader      # silnik mowy offline (wymaga też node i ffmpeg)
python3 tools/make_voice.py
```

## Uruchomienie

To zwykła strona internetowa (PWA). Nie wymaga instalowania niczego na komputerze.

- **Lokalnie:** `python3 -m http.server 8000` w tym folderze, a potem w przeglądarce adres `http://localhost:8000`.
- **Na telefonie:** opublikuj folder przez GitHub Pages (*Settings → Pages → Deploy from branch*). W Chrome lub Safari wybierz „Dodaj do ekranu głównego”. Gra pojawi się jak zwykła aplikacja i będzie działać bez internetu.

Postęp zapisuje się tylko na tym urządzeniu (localStorage).

## Pliki

- `index.html`: ekrany gry
- `css/style.css`: wygląd
- `js/data.js`: treści (postacie, zwierzątka, pokoje, słówka). Tu najłatwiej dodać nowe słowa lub pokój.
- `js/phrases.js`: wszystko, co gra mówi
- `audio/voice-pack.js`: nagrania głosu (generowane)
- `tools/`: generator nagrań
- `js/game.js`: logika gry
- `sw.js`, `manifest.webmanifest`, `icons/`: instalacja na telefonie i tryb offline
