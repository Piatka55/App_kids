'use strict';
/* Wszystko, co gra mówi. Krótko: polecenie po polsku albo słówko po angielsku.
   Dla każdej części jest nagranie w audio/voice-pack.js (tools/make_voice.py), więc nowy tekst dopisz też do T.all(). */
const T = (() => {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pl = t => ['pl', t], en = t => ['en', t];
  const N = n => PL_NUM[n], E = n => EN_NUM[n];

  const T = {
    hello: [pl('Cześć! Wybierz swoją postać.')],
    choosePet: [pl('Teraz wybierz zwierzaka. Będzie z tobą w podróży!')],
    hero: c => [en(c.en)],
    pet: p => [en(p.en)],
    story: [pl('Ruszamy w podróż! Dotknij świecącego kółka.')],
    episode: {
      home: [pl('Zaczynamy w domku!')], garden: [pl('Witaj w ogrodzie!')], beach: [pl('Jesteśmy na plaży!')],
      forest: [pl('Wchodzimy do lasu!')], castle: [pl('Oto magiczny zamek!')],
    },
    next: {
      home: [pl('Ruszamy do ogrodu!')], garden: [pl('Ruszamy na plażę!')], beach: [pl('Ruszamy do lasu!')],
      forest: [pl('Ruszamy do zamku!')], castle: [pl('Cała podróż ukończona! Brawo, brawo, brawo!')],
    },
    tutorial: {
      listen: [pl('Posłuchaj i dotknij obrazka.')],
      colors: [pl('Posłuchaj koloru i dotknij balonika.')],
      shapes: [pl('Posłuchaj i dotknij kształtu.')],
      numEN: [pl('Posłuchaj liczby i dotknij tylu kropek.')],
      memory: [pl('Znajdź dwa takie same obrazki.')],
      count: [pl('Policz i dotknij liczby.')],
      tapN: [pl('Daj zwierzakowi tyle smakołyków. Potem dotknij ptaszka.')],
      sub: [pl('Patrz! Kilka ucieka.')],
    },
    ask: {
      count: [pl('Ile?')], more: [pl('Gdzie więcej?')], less: [pl('Gdzie mniej?')],
      big: [pl('Który największy?')], small: [pl('Który najmniejszy?')], pattern: [pl('Co dalej?')],
      odd: [pl('Co nie pasuje?')], add: [pl('Ile razem?')], sub: [pl('Ile zostało?')], memory: [pl('Znajdź pary!')],
    },
    give: n => [pl(`Daj ${N(n)}!`)],
    word: w => [en(w)],
    num: n => [pl(N(n))],
    numBoth: n => [pl(N(n)), en(E(n))],
    praise: [[pl('Brawo!')], [pl('Super!')], [en('Great!')], [en('Yes!')], [en('Good job!')], [pl('Świetnie!')]],
    oops: [pl('Jeszcze raz!')],
    done: [[pl('Udało się!')], [pl('Brawo!')], [pl('Wspaniale!')]],
    chest: [pl('Skarb! To dla twojego zwierzaka.')],
    boss: [pl('Hu hu! Jestem sowa. Wielkie wyzwanie!')],
    friend: [pl('Brawo! Wybierz nowego przyjaciela!')],
    locked: [pl('Najpierw poprzednie kółko!')],
    house: [pl('Nakarm zwierzaka smakołykiem!')],
    noTreats: [pl('Zdobądź gwiazdki, a dostaniesz smakołyki!')],
    love: [en('I love you!')],
    voiceTest: [pl('Tak mówię po polsku.'), en('And this is English.')],
  };

  T.all = () => {
    const out = [];
    const walk = v => {
      if (Array.isArray(v)) { if (typeof v[0] === 'string') out.push(v); else v.forEach(walk); }
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    Object.values(T).forEach(v => { if (typeof v !== 'function') walk(v); });
    const add = parts => out.push(...parts);
    CHARACTERS.forEach(c => add(T.hero(c)));
    PETS.forEach(p => add(T.pet(p)));
    Object.values(WORDS).forEach(w => add(T.word(w[2])));
    COLORS.forEach(c => add(T.word(c.en)));
    SHAPES.forEach(s => add(T.word(s.en)));
    for (let n = 0; n <= 10; n++) { add(T.give(n)); add(T.numBoth(n)); add(T.num(n)); }
    const seen = new Set();
    return out.filter(([l, t]) => { const k = l + '|' + t; return !seen.has(k) && seen.add(k); });
  };
  return T;
})();
