'use strict';
/* Wszystko, co gra mówi na głos. Każda wypowiedź to lista części [język, tekst].
   Dla każdej części jest gotowe nagranie w audio/voice-pack.js (tworzy je tools/make_voice.py),
   więc nowy tekst dodawaj tylko tutaj i dopisz go do T.all(). */
const T = (() => {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pl = t => ['pl', t], en = t => ['en', t];
  const N = n => PL_NUM[n], E = n => EN_NUM[n];
  const STARS_WORD = ['zero gwiazdek', 'jedną gwiazdkę', 'dwie gwiazdki', 'trzy gwiazdki'];

  const T = {
    hello: [pl('Cześć!')],
    chooseFirst: [pl('Cześć! Wybierz swoją postać. Dotknij tej, którą lubisz najbardziej.')],
    choose: [pl('Wybierz postać.')],
    character: c => [pl(cap(c.pl) + '!'), en(c.en)],
    intro: [
      pl('To jest twój domek! Jesteśmy w kuchni. Po angielsku:'), en('kitchen.'),
      pl('Dotknij podłogi, żeby chodzić. Dotknij szafki, żeby ją otworzyć.'),
      pl('Zbierz trzy gwiazdki, a potem sowa zrobi ci test. Za test dostaniesz prezent: zwierzątko!'),
    ],
    room: r => [pl(cap(r.pl) + '. Po angielsku:'), en(r.en + '.')],
    hungryShort: [pl('Twoje zwierzątko jest głodne!')],
    petHungry: p => [pl(`${cap(p.pl)} jest ${p.f ? 'głodna' : 'głodny'}! Nakarm ${p.f ? 'ją' : 'go'} przy misce w kuchni.`)],
    petLove: p => [pl(cap(p.pl) + '. Po angielsku:'), en(p.en + '.'), en('I love you!')],
    doorLocked: prev => [pl(`Te drzwi są zamknięte. Zdobądź odznakę ${prev.gen} u sowy, a się otworzą!`)],
    object: o => [pl(cap(o.pl) + '. Po angielsku:'), en(o.en + '.'), en(o.en + '!')],
    item: (w, e) => [pl(cap(w) + '.'), en(e + '.')],
    tipItems: [pl('Dotknij rzeczy w środku, a powiem, jak się nazywają!')],
    allOpened: [pl('Brawo! Wszystko otwarte! Masz gwiazdkę!'), en('Star!')],
    starSlots: [[pl('Otwórz wszystkie szafki w tym pokoju.')], [pl('Pobaw się z papugą.')], [pl('Pobaw się z ośmiornicą.')]],
    starHave: [pl('Ta gwiazdka jest już twoja!')],
    goal: {
      hungryHere: [pl('Twoje zwierzątko jest głodne! Dotknij miski.')],
      hungryGo: [pl('Twoje zwierzątko jest głodne. Idź do kuchni, do miski!')],
      open: [pl('Dotknij tutaj, żeby otworzyć!')],
      parrot: [pl('Idź do papugi! Papuga mówi po angielsku.')],
      octo: [pl('Idź do ośmiornicy! Ośmiornica uczy liczyć.')],
      owl: [pl('Idź do sowy! Zrób test i zdobądź odznakę!')],
      door: [pl('Przejdź przez drzwi do następnego pokoju!')],
    },
    praise: [[pl('Brawo!')], [en('Great job!')], [pl('Super!')], [en('Well done!')], [pl('Świetnie!')], [en('Excellent!')], [pl('Ekstra!')]],
    tryAgain: [[pl('Spróbuj jeszcze raz!')], [pl('Prawie! Jeszcze raz!')]],
    rightIsHere: [pl('Dobra odpowiedź jest tutaj.')],

    findAsk: w => [pl('Pokaż:'), en(w + '.')],
    findOk: w => [en(w + '!')],
    thisIs: w => [pl('To jest'), en(w + '.')],
    howManyAsk: [pl('Policz! Ile ich jest?')],
    number: n => [pl(cap(N(n)) + '! Po angielsku:'), en(E(n) + '.')],
    notNumber: n => [pl('To nie ' + N(n) + '.')],
    say1: n => [pl(N(n))],
    empty: [pl('pusto')],
    compareAsk: more => [pl(more ? 'Gdzie jest więcej?' : 'Gdzie jest mniej?'), en(more ? 'More!' : 'Less!')],
    compareOk: (more, w, l) => [pl(`${cap(N(w))} to ${more ? 'więcej' : 'mniej'} niż ${N(l)}.`)],
    hereIs: n => [pl(`Tu jest ${N(n)}.`)],
    addAsk: (a, b) => [pl(`${cap(N(a))} plus ${N(b)}. Ile to razem?`)],
    addOk: (a, b) => [pl(`${cap(N(a))} plus ${N(b)} to ${N(a + b)}!`), en(`${E(a)} plus ${E(b)} is ${E(a + b)}.`)],
    countAsk: (pet, fruit, t, tip) => [
      pl(pet ? `Daj ${pet.dat} tyle ${pet.foodGen}:` : `Włóż do miski tyle ${fruit.gen}:`), pl(N(t) + '.'), en(E(t) + '!'),
      ...(tip ? [pl('Potem dotknij zielonego ptaszka.')] : []),
    ],
    bowlEmpty: [pl('Miska jest pusta.')],
    bowlWrong: (n, t) => [pl(`W misce jest ${N(n)}. A ma być ${N(t)}.`)],
    tooMany: [pl('Za dużo! Zabierz trochę.')],
    tooFew: [pl('Za mało! Dodaj jeszcze.')],

    newStar: [pl('Brawo! Masz nową gwiazdkę!'), en('Star!')],
    funAgain: [pl('Brawo! Świetna zabawa!')],
    parrotHi: [pl('Cześć! Jestem papuga. Mówię po angielsku. Posłuchaj i pokaż!')],
    octoHi: {
      count: [pl('Cześć! Jestem ośmiornica. Mam osiem rączek i lubię liczyć!')],
      mix: [pl('Cześć! Policzymy razem. Gotowe?')],
      add: [pl('Cześć! Dzisiaj dodajemy. Plus znaczy: dokładamy!')],
    },
    owlNeed: n => [pl(`Hu hu! Jestem sowa. Masz ${STARS_WORD[n]}. Zbierz trzy gwiazdki, a potem zrobimy test!`)],
    owlStart: [pl('Hu hu! Zaczynamy test. Sześć pytań. Dasz radę!')],
    testFail: (s, t) => [pl(`Prawie! Masz ${N(s)} na ${N(t)}. Poćwicz z papugą i ośmiornicą, i spróbuj jeszcze raz!`)],
    testAgain: [pl('Hu hu! Znowu świetnie! Brawo!')],
    badge: r => [pl(`Brawo! Masz odznakę! ${cap(r.pl)}, po angielsku:`), en(r.en + '!')],
    gift: [pl('Mam dla ciebie prezent! Dotknij prezentu!')],
    choosePet: [pl('Wybierz zwierzątko, którym będziesz się opiekować!')],
    pet: p => [pl(cap(p.pl) + '!'), en(p.en)],
    petChosen: p => [pl(`Hurra! ${cap(p.pl)} jest teraz z tobą! ${p.f ? 'Ona jest głodna' : 'On jest głodny'}. Nakarm ${p.f ? 'ją' : 'go'} przy misce w kuchni.`)],
    doorsOpen: r => [pl(`Otworzyły się drzwi do ${r.gen}! Po angielsku:`), en(r.en + '!')],
    allBadges: [pl('Masz wszystkie odznaki w domku! Brawo, brawo, brawo!')],
    bowlInfo: [pl('To miska. Po angielsku:'), en('bowl.'), pl('Tu będzie jadło twoje zwierzątko. Zdobądź odznakę u sowy!')],
    feedHungry: [pl('Mniam! Nakarmimy zwierzątka. Licz uważnie!')],
    feedSnack: [pl('Zwierzątka chcą przekąskę. Policzymy?')],
    thanks: [pl('Mniam, mniam! Dziękuję!'), en('Thank you!')],
    badgeName: r => [pl('Odznaka: ' + r.pl + '.'), en(r.en + '!')],
    badgeLocked: [pl('Tej odznaki jeszcze nie masz.')],
    badgeCount: n => [pl(n === 0 ? 'Nie masz jeszcze odznak. Sowa da ci odznakę za test!' : n === 1 ? 'Masz jedną odznakę!' : `Masz ${N(n)} odznaki!`)],
    voiceTest: [pl('Tak mówię po polsku.'), en('And this is English.')],
  };

  /* Każda możliwa wypowiedź, do wygenerowania nagrań. */
  T.all = () => {
    const out = [];
    const add = parts => out.push(...parts);
    const walk = v => {
      if (Array.isArray(v)) { if (typeof v[0] === 'string') out.push(v); else v.forEach(walk); }
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    Object.entries(T).forEach(([k, v]) => { if (typeof v !== 'function') walk(v); });
    CHARACTERS.forEach(c => add(T.character(c)));
    ROOMS.forEach((r, i) => {
      add(T.room(r)); add(T.badge(r)); add(T.doorsOpen(r)); add(T.badgeName(r));
      if (i > 0) add(T.doorLocked(ROOMS[i - 1]));
      r.objects.forEach(o => { add(T.object(o)); o.items.forEach(([, w, e]) => { add(T.item(w, e)); add(T.findAsk(e)); add(T.findOk(e)); add(T.thisIs(e)); }); });
    });
    PETS.forEach(p => { add(T.petHungry(p)); add(T.petLove(p)); add(T.pet(p)); add(T.petChosen(p)); });
    for (let n = 0; n <= 10; n++) { add(T.number(n)); add(T.notNumber(n)); add(T.say1(n)); add(T.hereIs(n)); }
    [true, false].forEach(m => { add(T.compareAsk(m)); for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (Math.abs(a - b) >= 2) add(T.compareOk(m, a, b)); });
    for (let a = 1; a <= 5; a++) for (let b = 1; a + b <= 6; b++) { add(T.addAsk(a, b)); add(T.addOk(a, b)); }
    for (let t = 1; t <= 5; t++) {
      [true, false].forEach(tip => { PETS.forEach(p => add(T.countAsk(p, null, t, tip))); FRUITS.forEach(f => add(T.countAsk(null, f, t, tip))); });
      for (let n = 1; n <= 9; n++) add(T.bowlWrong(n, t));
    }
    for (let n = 0; n <= 3; n++) add(T.owlNeed(n));
    for (let s = 0; s <= 6; s++) add(T.testFail(s, 6));
    for (let n = 0; n <= ROOMS.length; n++) add(T.badgeCount(n));
    const seen = new Set();
    return out.filter(([l, t]) => { const k = l + '|' + t; return !seen.has(k) && seen.add(k); });
  };
  return T;
})();
