# Click Whoosh

Zwift Click V2 jako przyciski zmiany biegów w MyWhoosh na Windows. Program łączy się z Clickiem przez Bluetooth i wysyła do MyWhoosh klawisze **K** (bieg w górę) oraz **I** (bieg w dół).

To pierwsza wersja testowa. Wersja na Androida będzie następnym krokiem.

## Instalacja (raz)

1. Zainstaluj Pythona z https://www.python.org/downloads/ i zaznacz **„Add python.exe to PATH”**.
2. Pobierz folder `click-whoosh`.
3. **Nie paruj** Clicka w ustawieniach Bluetooth Windows. Program łączy się sam. Jeśli Click jest już sparowany, usuń go z listy.

## Jazda

1. Zamknij aplikację Zwift i Zwift Companion, bo Click przyjmuje tylko jedno połączenie.
2. Uruchom `start.bat` dwuklikiem.
3. Naciśnij przycisk na obu częściach Clicka, żeby się wybudziły.
4. Gdy pojawi się „połączony”, kliknij w okno MyWhoosh. Klawisze trafiają do okna, które jest na wierzchu.

| Przycisk Clicka | Klawisz | MyWhoosh |
|---|---|---|
| **+** albo **Y** (prawa część) | K | bieg w górę |
| **−** albo **B** | I | bieg w dół |
| krzyżak (lewa część) | strzałki | menu |

Przypisania zmienisz w `click_whoosh.py` w słowniku `MAPPING`.

## Lewa część nie działa albo Click rozłącza się co minutę

Lewa część Clicka V2 jest „zablokowana” do czasu połączenia z oficjalną aplikacją Zwift. Prawa działa zawsze, dlatego biegi są też pod Y i B. Żeby odblokować lewą:

1. Otwórz aplikację Zwift (nie Companion) i zaloguj się. Subskrypcja nie jest potrzebna.
2. Na ekranie parowania połącz trenażer, potem Click V2.
3. Odczekaj 10–30 sekund, zamknij Zwift całkowicie i uruchom `start.bat`.

## Diagnoza

- `start.bat --tylko-log`: pokazuje wciśnięte przyciski, nie wysyła klawiszy.
- `start.bat --surowe`: pokazuje też surowe dane z Clicka. Przyda się, gdy coś nie działa: skopiuj wtedy wynik i wyślij.

Protokół Clicka opisałem na podstawie publicznie dostępnej wiedzy o urządzeniach Zwift. Kod jest napisany od nowa.
