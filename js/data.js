'use strict';
/* Treści gry: postacie, zwierzątka, pokoje, słówka.
   Każde słowo: [emoji, po polsku, po angielsku]. */

const PL_NUM = ['zero', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć', 'dziesięć'];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const CHARACTERS = [
  { e: '👧', pl: 'dziewczynka', en: 'girl' },
  { e: '👦', pl: 'chłopiec', en: 'boy' },
  { e: '👸', pl: 'księżniczka', en: 'princess' },
  { e: '🤴', pl: 'książę', en: 'prince' },
  { e: '🧚‍♀️', pl: 'wróżka', en: 'fairy' },
  { e: '🧜‍♀️', pl: 'syrenka', en: 'mermaid' },
  { e: '🦸‍♀️', pl: 'superbohaterka', en: 'superhero' },
  { e: '🧙‍♀️', pl: 'czarodziejka', en: 'wizard' },
  { e: '👩‍🚀', pl: 'astronautka', en: 'astronaut' },
  { e: '👩‍🍳', pl: 'kucharka', en: 'cook' },
  { e: '👩‍⚕️', pl: 'pani doktor', en: 'doctor' },
  { e: '👩‍🎨', pl: 'malarka', en: 'painter' },
  { e: '🐻', pl: 'miś', en: 'bear' },
  { e: '🐼', pl: 'panda', en: 'panda' },
  { e: '🦊', pl: 'lisek', en: 'fox' },
  { e: '🐸', pl: 'żabka', en: 'frog' },
  { e: '🐧', pl: 'pingwinek', en: 'penguin' },
  { e: '🦁', pl: 'lew', en: 'lion' },
  { e: '🐯', pl: 'tygrysek', en: 'tiger' },
  { e: '🐨', pl: 'koala', en: 'koala' },
  { e: '🦄', pl: 'jednorożec', en: 'unicorn' },
  { e: '🐲', pl: 'smok', en: 'dragon' },
  { e: '🤖', pl: 'robot', en: 'robot' },
  { e: '👽', pl: 'kosmita', en: 'alien' },
];

/* dat = celownik ("daj kotkowi"), foodGen = dopełniacz l.mn. ("tyle rybek"), f = rodzaj żeński */
const PETS = [
  { id: 'cat', e: '🐈', pl: 'kotek', dat: 'kotkowi', en: 'cat', food: '🐟', foodGen: 'rybek' },
  { id: 'dog', e: '🐕', pl: 'piesek', dat: 'pieskowi', en: 'dog', food: '🦴', foodGen: 'kosteczek' },
  { id: 'rabbit', e: '🐇', pl: 'króliczek', dat: 'króliczkowi', en: 'rabbit', food: '🥕', foodGen: 'marchewek' },
  { id: 'hamster', e: '🐹', pl: 'chomik', dat: 'chomikowi', en: 'hamster', food: '🌰', foodGen: 'orzeszków' },
  { id: 'turtle', e: '🐢', pl: 'żółwik', dat: 'żółwikowi', en: 'turtle', food: '🥬', foodGen: 'listków sałaty' },
  { id: 'parrot', e: '🦜', pl: 'papużka', dat: 'papużce', en: 'parrot', food: '🍓', foodGen: 'truskawek', f: true },
  { id: 'chick', e: '🐥', pl: 'kurczaczek', dat: 'kurczaczkowi', en: 'chick', food: '🌽', foodGen: 'kolb kukurydzy' },
  { id: 'panda', e: '🐼', pl: 'panda', dat: 'pandzie', en: 'panda', food: '🎋', foodGen: 'patyczków bambusa', f: true },
  { id: 'horse', e: '🐎', pl: 'konik', dat: 'konikowi', en: 'horse', food: '🍎', foodGen: 'jabłek' },
  { id: 'pig', e: '🐖', pl: 'świnka', dat: 'śwince', en: 'pig', food: '🍐', foodGen: 'gruszek', f: true },
  { id: 'hedgehog', e: '🦔', pl: 'jeżyk', dat: 'jeżykowi', en: 'hedgehog', food: '🍄', foodGen: 'grzybków' },
  { id: 'unicorn', e: '🦄', pl: 'jednorożec', dat: 'jednorożcowi', en: 'unicorn', food: '🍬', foodGen: 'cukierków' },
  { id: 'squirrel', e: '🐿️', pl: 'wiewiórka', dat: 'wiewiórce', en: 'squirrel', food: '🌰', foodGen: 'orzeszków', f: true },
  { id: 'duck', e: '🦆', pl: 'kaczuszka', dat: 'kaczuszce', en: 'duck', food: '🍞', foodGen: 'okruszków', f: true },
  { id: 'sheep', e: '🐑', pl: 'owieczka', dat: 'owieczce', en: 'sheep', food: '🍀', foodGen: 'koniczynek', f: true },
  { id: 'monkey', e: '🐒', pl: 'małpka', dat: 'małpce', en: 'monkey', food: '🍌', foodGen: 'bananów', f: true },
];
const PET_BY_ID = Object.fromEntries(PETS.map(p => [p.id, p]));

/* Owoce do liczenia, zanim dziecko ma zwierzątko */
const FRUITS = [
  { e: '🍎', gen: 'jabłek' }, { e: '🍌', gen: 'bananów' },
  { e: '🍓', gen: 'truskawek' }, { e: '🍪', gen: 'ciasteczek' },
];

/* Pomocnicy w każdym pokoju. Pozycje w jednostkach sceny (wysokość sceny = 100). */
const MASCOTS = [
  { id: 'parrot', e: '🦜', pl: 'papuga', x: 33, y: 17, size: 11, sign: 'ABC' },
  { id: 'octo', e: '🐙', pl: 'ośmiornica', x: 62, y: 5, size: 11, sign: '123' },
  { id: 'owl', e: '🦉', pl: 'sowa', x: 93, y: 15, size: 12, sign: '🎓' },
];

/* Pokój: x = środek, y = dół, w/h = rozmiar. Podłoga sięga do y = 40.
   math: rodzaj matematyki u ośmiornicy i w teście. */
const ROOMS = [
  {
    id: 'kitchen', pl: 'kuchnia', gen: 'kuchni', en: 'kitchen', icon: '🍳', math: 'count',
    objects: [
      { id: 'fridge', art: 'fridge', pl: 'lodówka', en: 'fridge', x: 15, y: 40, w: 17, h: 36,
        items: [['🥛', 'mleko', 'milk'], ['🧀', 'ser', 'cheese'], ['🥚', 'jajko', 'egg'], ['🍦', 'lody', 'ice cream']] },
      { id: 'window', art: 'window', pl: 'okno', en: 'window', x: 41, y: 60, w: 22, h: 19,
        items: [['☀️', 'słońce', 'sun'], ['🐦', 'ptak', 'bird'], ['🌳', 'drzewo', 'tree']] },
      { id: 'shelf', art: 'shelf', pl: 'półka', en: 'shelf', x: 68, y: 64, w: 24, h: 12,
        items: [['🍞', 'chleb', 'bread'], ['🍎', 'jabłko', 'apple'], ['🍌', 'banan', 'banana'], ['🍊', 'pomarańcza', 'orange']] },
      { id: 'cupboard', art: 'cupboard', pl: 'szafka', en: 'cupboard', x: 68, y: 40, w: 22, h: 16,
        items: [['☕', 'kubek', 'cup'], ['🍽️', 'talerz', 'plate'], ['🥄', 'łyżka', 'spoon'], ['🫖', 'czajniczek', 'teapot']] },
      { id: 'table', art: 'table', pl: 'stół', en: 'table', x: 94, y: 40, w: 20, h: 11,
        items: [['🎂', 'tort', 'cake'], ['🍕', 'pizza', 'pizza'], ['🥕', 'marchewka', 'carrot']] },
    ],
  },
  {
    id: 'bathroom', pl: 'łazienka', gen: 'łazienki', en: 'bathroom', icon: '🧼', math: 'mix',
    mathEmoji: ['🦆', '🧼', '🫧', '🧽', '🪥'],
    objects: [
      { id: 'mirror', art: '🪞', pl: 'lustro', en: 'mirror', x: 28, y: 60, w: 13, h: 15,
        items: [['👀', 'oczy', 'eyes'], ['👃', 'nos', 'nose'], ['👄', 'usta', 'mouth'], ['👂', 'ucho', 'ear'], ['✋', 'ręka', 'hand'], ['🦶', 'stopa', 'foot']] },
      { id: 'sink', art: 'sink', pl: 'umywalka', en: 'sink', x: 28, y: 40, w: 16, h: 18,
        items: [['🧼', 'mydło', 'soap'], ['🪥', 'szczoteczka', 'toothbrush'], ['💧', 'woda', 'water']] },
      { id: 'bath', art: '🛁', pl: 'wanna', en: 'bath', x: 58, y: 40, w: 26, h: 20,
        items: [['🦆', 'kaczuszka', 'duck'], ['🫧', 'bańki', 'bubbles'], ['🧽', 'gąbka', 'sponge']] },
      { id: 'basket', art: '🧺', pl: 'kosz', en: 'basket', x: 81, y: 40, w: 12, h: 12,
        items: [['🔴', 'czerwony', 'red'], ['🔵', 'niebieski', 'blue'], ['🟢', 'zielony', 'green'], ['🟡', 'żółty', 'yellow'], ['🟣', 'fioletowy', 'purple'], ['🟠', 'pomarańczowy', 'orange']] },
      { id: 'toilet', art: '🚽', pl: 'toaleta', en: 'toilet', x: 99, y: 40, w: 12, h: 15,
        items: [['🧻', 'papier', 'paper']] },
    ],
  },
  {
    id: 'bedroom', pl: 'sypialnia', gen: 'sypialni', en: 'bedroom', icon: '🧸', math: 'add',
    mathEmoji: ['⚽', '🎈', '🧸', '🚗', '⭐'],
    objects: [
      { id: 'window', art: 'window', pl: 'okno', en: 'window', x: 30, y: 62, w: 20, h: 17,
        items: [['🌙', 'księżyc', 'moon'], ['⭐', 'gwiazda', 'star'], ['☁️', 'chmura', 'cloud']] },
      { id: 'bed', art: '🛏️', pl: 'łóżko', en: 'bed', x: 30, y: 40, w: 26, h: 20,
        items: [['🧸', 'miś', 'teddy bear'], ['😴', 'spanie', 'sleep']] },
      { id: 'wardrobe', art: 'wardrobe', pl: 'szafa', en: 'wardrobe', x: 60, y: 40, w: 18, h: 34,
        items: [['👕', 'koszulka', 'T-shirt'], ['👖', 'spodnie', 'trousers'], ['👗', 'sukienka', 'dress'], ['🧦', 'skarpetki', 'socks'], ['🧢', 'czapka', 'cap'], ['👟', 'buty', 'shoes']] },
      { id: 'books', art: 'books', pl: 'książki', en: 'books', x: 88, y: 62, w: 22, h: 12,
        items: [['📕', 'książka', 'book'], ['✏️', 'ołówek', 'pencil'], ['🖍️', 'kredka', 'crayon'], ['✂️', 'nożyczki', 'scissors']] },
      { id: 'toybox', art: 'toybox', pl: 'skrzynia z zabawkami', en: 'toy box', x: 88, y: 40, w: 20, h: 13,
        items: [['⚽', 'piłka', 'ball'], ['🚗', 'autko', 'car'], ['🎈', 'balonik', 'balloon'], ['🪁', 'latawiec', 'kite'], ['🧩', 'puzzle', 'puzzle']] },
    ],
  },
];

/* Proste rysunki mebli (SVG) */
const INK = '#2B2140';
const ART = {
  fridge: `<svg viewBox="0 0 50 100" preserveAspectRatio="none"><rect x="2" y="2" width="46" height="96" rx="8" fill="#F2FAFF" stroke="${INK}" stroke-width="3"/><line x1="2" y1="36" x2="48" y2="36" stroke="${INK}" stroke-width="3"/><rect x="38" y="12" width="4" height="16" rx="2" fill="${INK}"/><rect x="38" y="44" width="4" height="24" rx="2" fill="${INK}"/><circle cx="14" cy="16" r="4" fill="#FF6B5B" stroke="${INK}" stroke-width="2"/><rect x="9" y="50" width="13" height="10" rx="2" fill="#FFC93C" stroke="${INK}" stroke-width="2"/><rect x="11" y="66" width="9" height="9" rx="2" fill="#7FD6A8" stroke="${INK}" stroke-width="2"/></svg>`,
  window: `<svg viewBox="0 0 100 86" preserveAspectRatio="none"><rect x="4" y="4" width="92" height="72" rx="6" fill="#9EDCFF" stroke="${INK}" stroke-width="4"/><circle cx="74" cy="24" r="10" fill="#FFC93C"/><path d="M8 62 q20 -16 40 0 q20 -14 44 0 v12 h-84z" fill="#7FD6A8"/><line x1="50" y1="4" x2="50" y2="76" stroke="${INK}" stroke-width="4"/><line x1="4" y1="40" x2="96" y2="40" stroke="${INK}" stroke-width="4"/><rect x="0" y="74" width="100" height="10" rx="3" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/></svg>`,
  shelf: `<svg viewBox="0 0 100 50" preserveAspectRatio="none"><rect x="8" y="14" width="16" height="24" rx="5" fill="#FFD7A8" stroke="${INK}" stroke-width="3"/><rect x="7" y="9" width="18" height="7" rx="2" fill="#FF6B5B" stroke="${INK}" stroke-width="3"/><rect x="34" y="6" width="20" height="32" rx="2" fill="#FFC93C" stroke="${INK}" stroke-width="3"/><circle cx="44" cy="20" r="5" fill="#FF6B5B"/><rect x="63" y="18" width="14" height="20" rx="5" fill="#C9F0D9" stroke="${INK}" stroke-width="3"/><rect x="62" y="13" width="16" height="7" rx="2" fill="#7A5CFA" stroke="${INK}" stroke-width="3"/><circle cx="88" cy="30" r="7" fill="#FF8A3D" stroke="${INK}" stroke-width="3"/><rect x="2" y="38" width="96" height="8" rx="3" fill="#B8733F" stroke="${INK}" stroke-width="3"/></svg>`,
  cupboard: `<svg viewBox="0 0 100 70" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="10" rx="3" fill="#F2FAFF" stroke="${INK}" stroke-width="3"/><rect x="6" y="12" width="88" height="56" rx="4" fill="#7FD6A8" stroke="${INK}" stroke-width="3"/><line x1="50" y1="12" x2="50" y2="68" stroke="${INK}" stroke-width="3"/><circle cx="42" cy="38" r="4" fill="#FFC93C" stroke="${INK}" stroke-width="2"/><circle cx="58" cy="38" r="4" fill="#FFC93C" stroke="${INK}" stroke-width="2"/></svg>`,
  table: `<svg viewBox="0 0 100 55" preserveAspectRatio="none"><rect x="2" y="4" width="96" height="10" rx="4" fill="#FF8A3D" stroke="${INK}" stroke-width="3"/><path d="M8 14 h84 l-6 8 h-72z" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/><rect x="12" y="20" width="7" height="34" rx="2" fill="#B8733F" stroke="${INK}" stroke-width="3"/><rect x="81" y="20" width="7" height="34" rx="2" fill="#B8733F" stroke="${INK}" stroke-width="3"/></svg>`,
  sink: `<svg viewBox="0 0 60 70" preserveAspectRatio="none"><rect x="27" y="2" width="6" height="12" rx="2" fill="#C8D3E0" stroke="${INK}" stroke-width="3"/><path d="M30 6 h12" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M4 16 h52 q0 18 -26 18 q-26 0 -26 -18z" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/><rect x="22" y="34" width="16" height="34" rx="4" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/></svg>`,
  wardrobe: `<svg viewBox="0 0 60 100" preserveAspectRatio="none"><rect x="2" y="2" width="56" height="8" rx="3" fill="#B97B4D" stroke="${INK}" stroke-width="3"/><rect x="4" y="10" width="52" height="84" rx="4" fill="#E58B5B" stroke="${INK}" stroke-width="3"/><line x1="30" y1="10" x2="30" y2="94" stroke="${INK}" stroke-width="3"/><circle cx="25" cy="52" r="3" fill="#FFC93C" stroke="${INK}" stroke-width="2"/><circle cx="35" cy="52" r="3" fill="#FFC93C" stroke="${INK}" stroke-width="2"/><path d="M12 20 l6 8 l-6 8z M48 20 l-6 8 l6 8z" fill="#FFD7A8"/><rect x="6" y="94" width="8" height="5" fill="${INK}"/><rect x="46" y="94" width="8" height="5" fill="${INK}"/></svg>`,
  books: `<svg viewBox="0 0 100 50" preserveAspectRatio="none"><rect x="8" y="10" width="9" height="28" fill="#FF6B5B" stroke="${INK}" stroke-width="3"/><rect x="17" y="6" width="9" height="32" fill="#7A5CFA" stroke="${INK}" stroke-width="3"/><rect x="26" y="12" width="9" height="26" fill="#FFC93C" stroke="${INK}" stroke-width="3"/><rect x="35" y="8" width="9" height="30" fill="#2FBF84" stroke="${INK}" stroke-width="3"/><rect x="50" y="14" width="9" height="24" fill="#5BB8FF" stroke="${INK}" stroke-width="3" transform="rotate(14 54 38)"/><circle cx="82" cy="28" r="10" fill="#FFD7A8" stroke="${INK}" stroke-width="3"/><path d="M76 20 l-4 -8 l9 5z M88 20 l4 -8 l-9 5z" fill="#FFD7A8" stroke="${INK}" stroke-width="2"/><rect x="2" y="38" width="96" height="8" rx="3" fill="#B8733F" stroke="${INK}" stroke-width="3"/></svg>`,
  toybox: `<svg viewBox="0 0 100 60" preserveAspectRatio="none"><rect x="4" y="16" width="92" height="42" rx="6" fill="#5BB8FF" stroke="${INK}" stroke-width="3"/><rect x="2" y="4" width="96" height="14" rx="6" fill="#FF6B5B" stroke="${INK}" stroke-width="3"/><path d="M50 26 l4 8 h9 l-7 6 l3 9 l-9 -5 l-9 5 l3 -9 l-7 -6 h9z" fill="#FFC93C" stroke="${INK}" stroke-width="2"/></svg>`,
  door: `<svg viewBox="0 0 50 100" preserveAspectRatio="none"><rect x="2" y="2" width="46" height="98" rx="4" fill="#C98B5B" stroke="${INK}" stroke-width="3"/><rect x="8" y="10" width="34" height="34" rx="3" fill="#B97B4D" stroke="${INK}" stroke-width="2"/><rect x="8" y="52" width="34" height="40" rx="3" fill="#B97B4D" stroke="${INK}" stroke-width="2"/><circle cx="40" cy="50" r="3.5" fill="#FFC93C" stroke="${INK}" stroke-width="2"/></svg>`,
};
