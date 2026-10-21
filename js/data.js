'use strict';
/* Treści gry: postacie, zwierzaki, słówka, krainy (epizody) i poziomy. */

const PL_NUM = ['zero', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć', 'dziesięć'];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const CHARACTERS = [
  { e: '👧', pl: 'dziewczynka', en: 'girl' }, { e: '👦', pl: 'chłopiec', en: 'boy' },
  { e: '👸', pl: 'księżniczka', en: 'princess' }, { e: '🤴', pl: 'książę', en: 'prince' },
  { e: '🧚‍♀️', pl: 'wróżka', en: 'fairy' }, { e: '🧜‍♀️', pl: 'syrenka', en: 'mermaid' },
  { e: '🦸‍♀️', pl: 'superbohaterka', en: 'superhero' }, { e: '🧙‍♀️', pl: 'czarodziejka', en: 'wizard' },
  { e: '👩‍🚀', pl: 'astronautka', en: 'astronaut' }, { e: '👩‍🍳', pl: 'kucharka', en: 'cook' },
  { e: '👩‍⚕️', pl: 'pani doktor', en: 'doctor' }, { e: '👩‍🎨', pl: 'malarka', en: 'painter' },
  { e: '🐻', pl: 'miś', en: 'bear' }, { e: '🐼', pl: 'panda', en: 'panda' },
  { e: '🦊', pl: 'lisek', en: 'fox' }, { e: '🐸', pl: 'żabka', en: 'frog' },
  { e: '🐧', pl: 'pingwinek', en: 'penguin' }, { e: '🦁', pl: 'lew', en: 'lion' },
  { e: '🐯', pl: 'tygrysek', en: 'tiger' }, { e: '🐨', pl: 'koala', en: 'koala' },
  { e: '🦄', pl: 'jednorożec', en: 'unicorn' }, { e: '🐲', pl: 'smok', en: 'dragon' },
  { e: '🤖', pl: 'robot', en: 'robot' }, { e: '👽', pl: 'kosmita', en: 'alien' },
];

const PETS = [
  { id: 'cat', e: '🐈', pl: 'kotek', en: 'cat' }, { id: 'dog', e: '🐕', pl: 'piesek', en: 'dog' },
  { id: 'rabbit', e: '🐇', pl: 'króliczek', en: 'rabbit' }, { id: 'hamster', e: '🐹', pl: 'chomik', en: 'hamster' },
  { id: 'turtle', e: '🐢', pl: 'żółwik', en: 'turtle' }, { id: 'parrot', e: '🦜', pl: 'papużka', en: 'parrot' },
  { id: 'chick', e: '🐥', pl: 'kurczaczek', en: 'chick' }, { id: 'panda', e: '🐼', pl: 'panda', en: 'panda' },
  { id: 'horse', e: '🐎', pl: 'konik', en: 'horse' }, { id: 'pig', e: '🐖', pl: 'świnka', en: 'pig' },
  { id: 'hedgehog', e: '🦔', pl: 'jeżyk', en: 'hedgehog' }, { id: 'unicorn', e: '🦄', pl: 'jednorożec', en: 'unicorn' },
  { id: 'squirrel', e: '🐿️', pl: 'wiewiórka', en: 'squirrel' }, { id: 'duck', e: '🦆', pl: 'kaczuszka', en: 'duck' },
  { id: 'sheep', e: '🐑', pl: 'owieczka', en: 'sheep' }, { id: 'monkey', e: '🐒', pl: 'małpka', en: 'monkey' },
];
const PET_BY_ID = Object.fromEntries(PETS.map(p => [p.id, p]));

/* Skarby ze skrzynek: ozdoby dla zwierzaka. spot = gdzie siedzi na zwierzaku. */
const ACCESSORIES = [
  { id: 'bow', e: '🎀', spot: 'head' }, { id: 'crown', e: '👑', spot: 'head' },
  { id: 'glasses', e: '🕶️', spot: 'face' }, { id: 'tophat', e: '🎩', spot: 'head' },
  { id: 'flower', e: '🌸', spot: 'head' }, { id: 'scarf', e: '🧣', spot: 'neck' },
  { id: 'cap', e: '🧢', spot: 'head' }, { id: 'balloon', e: '🎈', spot: 'side' },
  { id: 'gradcap', e: '🎓', spot: 'head' }, { id: 'star', e: '🌟', spot: 'side' },
];

/* Słówka: id -> [emoji, po polsku, po angielsku] */
const WORDS = {
  apple: ['🍎', 'jabłko', 'apple'], banana: ['🍌', 'banan', 'banana'], milk: ['🥛', 'mleko', 'milk'],
  bread: ['🍞', 'chleb', 'bread'], cheese: ['🧀', 'ser', 'cheese'], egg: ['🥚', 'jajko', 'egg'],
  carrot: ['🥕', 'marchewka', 'carrot'], cake: ['🍰', 'ciasto', 'cake'], strawberry: ['🍓', 'truskawka', 'strawberry'],
  grapes: ['🍇', 'winogrona', 'grapes'], cookie: ['🍪', 'ciastko', 'cookie'], pear: ['🍐', 'gruszka', 'pear'],

  cat: ['🐈', 'kot', 'cat'], dog: ['🐕', 'pies', 'dog'], bird: ['🐦', 'ptak', 'bird'], cow: ['🐄', 'krowa', 'cow'],
  horse: ['🐎', 'koń', 'horse'], pig: ['🐖', 'świnka', 'pig'], duck: ['🦆', 'kaczka', 'duck'], rabbit: ['🐇', 'królik', 'rabbit'],
  frog: ['🐸', 'żaba', 'frog'], bee: ['🐝', 'pszczoła', 'bee'], butterfly: ['🦋', 'motyl', 'butterfly'], snail: ['🐌', 'ślimak', 'snail'],

  fish: ['🐟', 'ryba', 'fish'], crab: ['🦀', 'krab', 'crab'], shell: ['🐚', 'muszelka', 'shell'], sun: ['☀️', 'słońce', 'sun'],
  boat: ['⛵', 'łódka', 'boat'], icecream: ['🍦', 'lody', 'ice cream'], whale: ['🐳', 'wieloryb', 'whale'], octopus: ['🐙', 'ośmiornica', 'octopus'],
  dolphin: ['🐬', 'delfin', 'dolphin'], umbrella: ['⛱️', 'parasol', 'umbrella'], hat: ['👒', 'kapelusz', 'hat'], ball: ['⚽', 'piłka', 'ball'],

  tree: ['🌳', 'drzewo', 'tree'], bear: ['🐻', 'niedźwiedź', 'bear'], fox: ['🦊', 'lis', 'fox'], owl: ['🦉', 'sowa', 'owl'],
  mushroom: ['🍄', 'grzyb', 'mushroom'], flower: ['🌼', 'kwiatek', 'flower'], hedgehog: ['🦔', 'jeż', 'hedgehog'], squirrel: ['🐿️', 'wiewiórka', 'squirrel'],
  leaf: ['🍁', 'liść', 'leaf'], deer: ['🦌', 'jeleń', 'deer'], wolf: ['🐺', 'wilk', 'wolf'], acorn: ['🌰', 'żołądź', 'acorn'],

  crown: ['👑', 'korona', 'crown'], dragon: ['🐉', 'smok', 'dragon'], castle: ['🏰', 'zamek', 'castle'], key: ['🔑', 'klucz', 'key'],
  king: ['🤴', 'król', 'king'], queen: ['👸', 'królowa', 'queen'], star: ['⭐', 'gwiazda', 'star'], moon: ['🌙', 'księżyc', 'moon'],
  rocket: ['🚀', 'rakieta', 'rocket'], unicorn: ['🦄', 'jednorożec', 'unicorn'], gift: ['🎁', 'prezent', 'gift'], ring: ['💍', 'pierścionek', 'ring'],
};

const COLORS = [
  { id: 'red', hex: '#F2473F', pl: 'czerwony', en: 'red' }, { id: 'blue', hex: '#3D8BFF', pl: 'niebieski', en: 'blue' },
  { id: 'green', hex: '#2FBF5B', pl: 'zielony', en: 'green' }, { id: 'yellow', hex: '#FFD23F', pl: 'żółty', en: 'yellow' },
  { id: 'purple', hex: '#9B5CF6', pl: 'fioletowy', en: 'purple' }, { id: 'orange', hex: '#FF8A2A', pl: 'pomarańczowy', en: 'orange' },
  { id: 'pink', hex: '#FF7AC6', pl: 'różowy', en: 'pink' }, { id: 'brown', hex: '#9A6338', pl: 'brązowy', en: 'brown' },
];

const SHAPES = [
  { id: 'circle', pl: 'koło', en: 'circle' }, { id: 'square', pl: 'kwadrat', en: 'square' },
  { id: 'triangle', pl: 'trójkąt', en: 'triangle' }, { id: 'star', pl: 'gwiazda', en: 'star' },
  { id: 'heart', pl: 'serce', en: 'heart' }, { id: 'rectangle', pl: 'prostokąt', en: 'rectangle' },
];

/* Grupy do zadania „co nie pasuje” */
const GROUPS = {
  fruit: ['🍎', '🍌', '🍇', '🍓', '🍐', '🍊'], veg: ['🥕', '🥦', '🌽', '🥒', '🍅'],
  animals: ['🐈', '🐕', '🐄', '🐖', '🐑', '🐎'], vehicles: ['🚗', '🚌', '🚲', '🚂', '🚀', '✈️'],
  clothes: ['👕', '👖', '🧦', '🧢', '👗', '👟'], toys: ['⚽', '🧸', '🪁', '🎈', '🪀', '🧩'],
  sea: ['🐟', '🐙', '🦀', '🐳', '🐬', '🐚'], birds: ['🐦', '🦆', '🦉', '🦜', '🐧', '🐓'],
};

/* Lekcja = 📖 nauka (learn) + 🎮 gra-test (test: lista zadań) + 🍬 nagroda za co najmniej 2 gwiazdki.
   W(…) lekcja słówek, M(…) lekcja matematyki lub logiki. */
const W = (words, test, kind = 'words') => ({ kind: 'lesson', subj: 'en', learn: { t: kind, words }, test });
const M = (icon, learn, test) => ({ kind: 'lesson', subj: 'math', icon, learn, test });
const CHEST = { kind: 'chest' };
const BOSS = test => ({ kind: 'boss', test });
const x = (n, spec) => Array.from({ length: n }, () => spec);
const listen = (n, review = false) => ['listen', { n, review }];

const EPISODES = [
  {
    id: 'home', pl: 'Domek', icon: '🏠', sky: ['#FFE9B8', '#FFCFB0'], ground: '#F6B48F',
    deco: ['🪴', '🛋️', '🧸', '🖼️', '🕯️', '📚'], emo: ['🍎', '🍪', '🍓', '🧁'],
    nodes: [
      W(['apple', 'banana', 'milk'], [listen(2), listen(2), listen(3), listen(3), ['memory', { pairs: 3 }]]),
      M('🔢', { t: 'numbers', from: 1, to: 3 }, [['count', { max: 3 }], ['numEN', { max: 3 }], ['count', { max: 3 }], ['numEN', { max: 3 }], ['count', { max: 3 }]]),
      W(['bread', 'cheese', 'egg'], [listen(3), listen(3), listen(3, true), listen(3), ['memory', { pairs: 3 }]]),
      M('🍪', { t: 'onetoone' }, [['tapN', { max: 3 }], ['count', { max: 4 }], ['tapN', { max: 4 }], ['count', { max: 4 }], ['tapN', { max: 4 }]]),
      CHEST,
      W(['carrot', 'cake', 'strawberry', 'cookie'], [listen(3), listen(3), listen(3, true), listen(4), ['memory', { pairs: 4 }]]),
      M('⚖️', { t: 'more' }, x(5, ['compare', { max: 5 }])),
      M('🧩', { t: 'pattern', kind: 'AB' }, x(5, ['pattern', { kinds: ['AB'] }])),
      BOSS([listen(3, true), ['count', { max: 4 }], listen(3, true), ['tapN', { max: 4 }], ['pattern', { kinds: ['AB'] }], ['numEN', { max: 3 }], ['compare', { max: 5 }]]),
    ],
  },
  {
    id: 'garden', pl: 'Ogród', icon: '🌻', sky: ['#C8F1FF', '#B6F0C2'], ground: '#7FD68F',
    deco: ['🌷', '🌻', '🌳', '🐞', '🦋', '🌼'], emo: ['🐞', '🌼', '🐝', '🦋'],
    nodes: [
      W(['cat', 'dog', 'bird', 'cow'], [listen(3), listen(3), listen(4, true), listen(4), ['memory', { pairs: 4 }]]),
      M('🔢', { t: 'numbers', from: 4, to: 5 }, [['count', { max: 5 }], ['numEN', { max: 5 }], ['count', { max: 5 }], ['numEN', { max: 5 }], ['tapN', { max: 5 }]]),
      W(['red', 'blue', 'yellow', 'green'], x(5, ['colors', { n: 3 }]), 'colors'),
      M('🎲', { t: 'subitize' }, x(5, ['flash', { max: 5 }])),
      CHEST,
      W(['horse', 'pig', 'duck', 'rabbit', 'frog'], [listen(4), listen(4), listen(4, true), listen(4), ['memory', { pairs: 4 }]]),
      W(['circle', 'square', 'triangle'], x(5, ['shapes', { n: 3 }]), 'shapes'),
      M('🔍', { t: 'odd' }, x(5, ['odd', { n: 4 }])),
      BOSS([listen(4, true), ['colors', { n: 4 }], ['flash', { max: 5 }], ['shapes', { n: 3 }], ['odd', { n: 4 }], ['numEN', { max: 5 }], ['memory', { pairs: 4 }]]),
    ],
  },
  {
    id: 'beach', pl: 'Plaża', icon: '🏖️', sky: ['#9EDCFF', '#FFE8A8'], ground: '#F7D58B',
    deco: ['🌴', '🐚', '⛱️', '🦀', '🌊', '⛵'], emo: ['🐚', '🐟', '⭐', '🦀'],
    nodes: [
      W(['fish', 'crab', 'shell', 'whale'], [listen(4), listen(4), listen(4, true), listen(4), ['memory', { pairs: 4 }]]),
      M('🔟', { t: 'tenframe' }, [['frame', { max: 10 }], ['frame', { max: 10 }], ['numEN', { max: 8 }], ['frame', { max: 10 }], ['numEN', { max: 10 }]]),
      M('➕', { t: 'add', ex: [[2, 1], [3, 2]] }, x(5, ['add', { max: 5 }])),
      W(['boat', 'sun', 'icecream', 'umbrella', 'hat'], [listen(4), listen(4), listen(5, true), listen(5), ['memory', { pairs: 5 }]]),
      CHEST,
      M('📏', { t: 'size' }, x(5, ['size', {}])),
      W(['purple', 'orange', 'pink', 'brown'], x(5, ['colors', { n: 4 }]), 'colors'),
      M('🧩', { t: 'pattern', kind: 'ABC' }, [['pattern', { kinds: ['ABC'] }], ['pattern', { kinds: ['ABB'] }], ['pattern', { kinds: ['ABC'] }], ['pattern', { kinds: ['ABB'] }], ['pattern', { kinds: ['ABC'] }]]),
      BOSS([listen(5, true), ['add', { max: 5 }], ['frame', { max: 10 }], ['size', {}], ['colors', { n: 5 }], ['pattern', { kinds: ['ABC'] }], ['memory', { pairs: 5 }]]),
    ],
  },
  {
    id: 'forest', pl: 'Las', icon: '🌲', sky: ['#BFE6D0', '#8FCB9B'], ground: '#5FAF6E',
    deco: ['🌲', '🍄', '🌳', '🦔', '🍁', '🪵'], emo: ['🍄', '🌰', '🍁', '🌲'],
    nodes: [
      W(['tree', 'bear', 'fox', 'owl'], [listen(4), listen(4), listen(5, true), listen(5), ['memory', { pairs: 5 }]]),
      M('➖', { t: 'sub', ex: [5, 2] }, x(5, ['sub', { max: 5 }])),
      W(['mushroom', 'flower', 'hedgehog', 'squirrel'], [listen(4), listen(5), listen(5, true), listen(5), ['memory', { pairs: 5 }]]),
      M('➕', { t: 'counton' }, x(5, ['add', { max: 10 }])),
      CHEST,
      W(['leaf', 'deer', 'wolf', 'acorn'], [listen(5), listen(5), listen(6, true), listen(5), ['memory', { pairs: 6 }]]),
      M('⚖️', { t: 'more', less: true }, x(5, ['compare', { max: 10, less: true }])),
      M('🧩', { t: 'pattern', kind: 'AAB' }, [['pattern', { kinds: ['AAB'] }], ['odd', { n: 5 }], ['pattern', { kinds: ['AAB'] }], ['odd', { n: 5 }], ['pattern', { kinds: ['AAB'] }]]),
      BOSS([listen(5, true), ['sub', { max: 6 }], ['add', { max: 8 }], ['compare', { max: 10, less: true }], ['odd', { n: 5 }], ['pattern', { kinds: ['AAB'] }], ['memory', { pairs: 6 }]]),
    ],
  },
  {
    id: 'castle', pl: 'Zamek', icon: '🏰', sky: ['#D9CCFF', '#FFC8E6'], ground: '#B9A3F5',
    deco: ['🏰', '✨', '🌙', '⭐', '🐉', '💎'], emo: ['💎', '⭐', '👑', '🔑'],
    nodes: [
      W(['crown', 'dragon', 'castle', 'key'], [listen(4), listen(5), listen(5, true), listen(5), ['memory', { pairs: 5 }]]),
      M('🔟', { t: 'bonds' }, x(5, ['bond', {}])),
      W(['king', 'queen', 'star', 'moon'], [listen(5), listen(5), listen(6, true), listen(6), ['memory', { pairs: 6 }]]),
      M('➖', { t: 'sub', ex: [8, 3] }, x(5, ['sub', { max: 9 }])),
      CHEST,
      W(['rocket', 'unicorn', 'gift', 'ring'], [listen(5), listen(6), listen(6, true), listen(6), ['memory', { pairs: 6 }]]),
      W(['star', 'heart', 'rectangle'], x(5, ['shapes', { n: 4 }]), 'shapes'),
      M('🧩', { t: 'pattern', kind: 'AABB' }, [['pattern', { kinds: ['AABB'] }], ['add', { max: 10 }], ['pattern', { kinds: ['AABB'] }], ['sub', { max: 10 }], ['pattern', { kinds: ['AABB'] }]]),
      BOSS([listen(6, true), ['bond', {}], ['add', { max: 10 }], ['sub', { max: 10 }], ['numEN', { max: 10 }], ['pattern', { kinds: ['AABB'] }], ['memory', { pairs: 6 }]]),
    ],
  },
];

/* Cukierki do nagrody (układanka trzy w rzędzie) */
const CANDY = ['🍬', '🍭', '🍩', '🧁', '🍫'];
