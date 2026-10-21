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

/* Pomocnik do opisu poziomów: L(typ zadania, parametry). Każdy poziom ma 5 zadań (memory: 2 plansze). */
const L = (type, p = {}) => ({ kind: 'level', type, p });
const CHEST = { kind: 'chest' };
const BOSS = tasks => ({ kind: 'boss', type: 'mix', p: { tasks } });

const EPISODES = [
  {
    id: 'home', pl: 'Domek', icon: '🏠', sky: ['#FFE9B8', '#FFCFB0'], ground: '#F6B48F',
    deco: ['🪴', '🛋️', '🧸', '🖼️', '🕯️', '📚'],
    words: ['apple', 'banana', 'milk', 'bread', 'cheese', 'egg', 'carrot', 'cake', 'strawberry', 'cookie'],
    emo: ['🍎', '🍪', '🍓', '🧁'],
    nodes: [
      L('listen', { n: 2 }), L('count', { max: 3 }), L('listen', { n: 3 }), L('tapN', { max: 3 }),
      CHEST, L('pattern', { kinds: ['AB'] }), L('numEN', { max: 3 }), L('compare', { max: 5 }), L('memory', { pairs: 3 }),
      BOSS([['listen', { n: 3 }], ['count', { max: 4 }], ['listen', { n: 3 }], ['tapN', { max: 4 }], ['pattern', { kinds: ['AB'] }], ['numEN', { max: 3 }]]),
    ],
  },
  {
    id: 'garden', pl: 'Ogród', icon: '🌻', sky: ['#C8F1FF', '#B6F0C2'], ground: '#7FD68F',
    deco: ['🌷', '🌻', '🌳', '🐞', '🦋', '🌼'],
    words: ['cat', 'dog', 'bird', 'cow', 'horse', 'pig', 'duck', 'rabbit', 'frog', 'bee', 'butterfly', 'snail'],
    emo: ['🐞', '🌼', '🐝', '🦋'],
    nodes: [
      L('colors', { n: 3 }), L('count', { max: 6 }), L('listen', { n: 3 }), L('shapes', { n: 3, set: 3 }),
      L('pattern', { kinds: ['AB', 'ABB'] }), CHEST, L('tapN', { max: 6 }), L('odd', { n: 4 }), L('memory', { pairs: 4 }), L('numEN', { max: 5 }),
      BOSS([['colors', { n: 4 }], ['count', { max: 7 }], ['listen', { n: 4 }], ['shapes', { n: 3, set: 3 }], ['odd', { n: 4 }], ['numEN', { max: 5 }]]),
    ],
  },
  {
    id: 'beach', pl: 'Plaża', icon: '🏖️', sky: ['#9EDCFF', '#FFE8A8'], ground: '#F7D58B',
    deco: ['🌴', '🐚', '⛱️', '🦀', '🌊', '⛵'],
    words: ['fish', 'crab', 'shell', 'sun', 'boat', 'icecream', 'whale', 'octopus', 'dolphin', 'umbrella', 'hat', 'ball'],
    emo: ['🐚', '🐟', '⭐', '🦀'],
    nodes: [
      L('add', { max: 4 }), L('listen', { n: 4 }), L('count', { max: 8 }), L('size', {}),
      L('colors', { n: 4 }), CHEST, L('pattern', { kinds: ['ABC', 'ABB'] }), L('add', { max: 5 }), L('memory', { pairs: 5 }), L('compare', { max: 10, less: true }),
      BOSS([['add', { max: 5 }], ['listen', { n: 4 }], ['count', { max: 9 }], ['size', {}], ['pattern', { kinds: ['ABC'] }], ['colors', { n: 5 }]]),
    ],
  },
  {
    id: 'forest', pl: 'Las', icon: '🌲', sky: ['#BFE6D0', '#8FCB9B'], ground: '#5FAF6E',
    deco: ['🌲', '🍄', '🌳', '🦔', '🍁', '🪵'],
    words: ['tree', 'bear', 'fox', 'owl', 'mushroom', 'flower', 'hedgehog', 'squirrel', 'leaf', 'deer', 'wolf', 'acorn'],
    emo: ['🍄', '🌰', '🍁', '🌲'],
    nodes: [
      L('sub', { max: 5 }), L('listen', { n: 4 }), L('numEN', { max: 8 }), L('odd', { n: 5 }),
      L('add', { max: 7 }), CHEST, L('pattern', { kinds: ['AAB', 'ABC'] }), L('shapes', { n: 4, set: 5 }), L('memory', { pairs: 6 }), L('tapN', { max: 9 }),
      BOSS([['sub', { max: 6 }], ['listen', { n: 5 }], ['numEN', { max: 9 }], ['odd', { n: 5 }], ['add', { max: 8 }], ['pattern', { kinds: ['AAB'] }]]),
    ],
  },
  {
    id: 'castle', pl: 'Zamek', icon: '🏰', sky: ['#D9CCFF', '#FFC8E6'], ground: '#B9A3F5',
    deco: ['🏰', '✨', '🌙', '⭐', '🐉', '💎'],
    words: ['crown', 'dragon', 'castle', 'key', 'king', 'queen', 'star', 'moon', 'rocket', 'unicorn', 'gift', 'ring'],
    emo: ['💎', '⭐', '👑', '🔑'],
    nodes: [
      L('add', { max: 10 }), L('listen', { n: 5 }), L('sub', { max: 8 }), L('colors', { n: 6 }),
      L('pattern', { kinds: ['ABC', 'AABB'] }), CHEST, L('numEN', { max: 10 }), L('compare', { max: 10, less: true }), L('memory', { pairs: 6 }), L('shapes', { n: 5, set: 6 }),
      BOSS([['add', { max: 10 }], ['sub', { max: 9 }], ['listen', { n: 6 }], ['numEN', { max: 10 }], ['pattern', { kinds: ['AABB'] }], ['odd', { n: 5 }]]),
    ],
  },
];

/* Ikonki zadań na mapie */
const TYPE_ICON = {
  listen: '👂', colors: '🎨', shapes: '🔷', numEN: '🔢', memory: '🃏', count: '🧮', tapN: '🍪',
  compare: '⚖️', size: '📏', pattern: '🧩', odd: '🔍', add: '➕', sub: '➖', mix: '🦉',
};
