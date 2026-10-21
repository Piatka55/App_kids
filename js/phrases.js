'use strict';
/* Wszystko, co gra mówi. Krótko: polecenie po polsku albo słówko po angielsku (znaczenie niesie obrazek, bez tłumaczenia).
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

    /* trzy kroki lekcji */
    learnStart: [pl('Najpierw nauka!')],
    gameStart: [pl('A teraz zagrajmy!')],
    rewardFirst: [pl('Nagroda! Przesuń cukierek, żeby ułożyć trzy takie same.')],
    reward: [pl('Nagroda!')],
    rewardEnd: [pl('Ale słodko! Smakołyki dla zwierzaka!')],
    tryLearn: [pl('Poćwiczmy jeszcze raz. Dasz radę!')],

    /* nauka */
    learn: {
      words: [pl('Posłuchaj i powtórz.')],
      guided: [pl('Pokaż!')],
      numbers: [pl('Poznajemy liczby.')],
      onetoone: [pl('Liczymy po kolei. Dotknij każdego i licz ze mną.')],
      moreA: [pl('Połączmy w pary.')],
      moreB: [pl('Tu zostały bez pary. Tu jest więcej!')],
      lessB: [pl('A tu jest mniej.')],
      pattern: [pl('Posłuchaj wzoru.')],
      patternEnd: [pl('Wzór się powtarza!')],
      subitize: [pl('Popatrz szybko! Ile kropek? Bez liczenia!')],
      oddA: [pl('Te pasują do siebie.')],
      oddB: [pl('A ten nie pasuje!')],
      frameA: [pl('To jest ramka. Mieści dziesięć.')],
      frameB: [pl('Pięć na górze i dwa na dole. Razem siedem!')],
      counton: [pl('Zaczynamy od pięciu i liczymy dalej: sześć, siedem, osiem!')],
      sizeSmall: [pl('Mały.'), en('small')],
      sizeMid: [pl('Średni.')],
      sizeBig: [pl('Duży!'), en('big')],
      bondA: [pl('Sześć kropek. Ile brakuje do dziesięciu?')],
      bondB: [pl('Cztery! Sześć i cztery to dziesięć.')],
      tapEach: [pl('Teraz ty!')],
    },
    addEx: (a, b) => [pl(`${cap(N(a))} i ${N(b)}.`), pl(`Razem ${N(a + b)}!`)],
    subEx: (a, b) => [pl(`Było ${N(a)}.`), pl(`${cap(N(b))} ${b > 4 ? 'uciekło' : 'uciekły'}.`), pl(`${a - b === 1 ? 'Został' : a - b > 4 ? 'Zostało' : 'Zostały'} ${N(a - b)}!`)],

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
      flash: [pl('Ile kropek?')], bond: [pl('Ile brakuje do dziesięciu?')],
    },
    give: n => [pl(`Daj ${N(n)}!`)],
    word: w => [en(w)],
    num: n => [pl(N(n))],
    numBoth: n => [pl(N(n)), en(E(n))],
    countAlong: [pl('Policzmy razem.')],
    praise: [[pl('Brawo!')], [pl('Super!')], [en('Great!')], [en('Yes!')], [en('Good job!')], [pl('Świetnie!')]],
    combo: [[en('Sweet!')], [en('Wow!')], [pl('Ekstra!')]],
    oops: [pl('Jeszcze raz!')],
    done: [[pl('Udało się!')], [pl('Brawo!')], [pl('Wspaniale!')]],
    chest: [pl('Skarb! To dla twojego zwierzaka.')],
    boss: [pl('Hu hu! Jestem sowa. Sprawdzę, co już umiesz!')],
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
    for (let n = 0; n <= 10; n++) { add(T.give(n)); add(T.numBoth(n)); add(T.num(n)); add(T.word(EN_NUM[n])); }
    EPISODES.forEach(ep => ep.nodes.forEach(n => {
      const l = n.learn || {};
      if (l.t === 'add') l.ex.forEach(([a, b]) => add(T.addEx(a, b)));
      if (l.t === 'sub') add(T.subEx(l.ex[0], l.ex[1]));
    }));
    const seen = new Set();
    return out.filter(([l, t]) => { const k = l + '|' + t; return !seen.has(k) && seen.add(k); });
  };
  return T;
})();
