// Wypisuje (JSON) wszystkie wypowiedzi gry: [[język, tekst], ...]
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({});
for (const f of ['js/data.js', 'js/phrases.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
process.stdout.write(JSON.stringify(vm.runInContext('T.all()', ctx)));
