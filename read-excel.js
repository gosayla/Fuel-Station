const x = require('C:/Users/USER/AppData/Roaming/npm/node_modules/xlsx');
const wb = x.readFile('excel-sheet.xlsx');

// Sheet 1 - all rows
const ws1 = wb.Sheets['ورقة1'];
const data1 = x.utils.sheet_to_json(ws1, { header: 1 });
console.log('=== ورقة1 - ALL ROWS ===');
console.log('Total rows:', data1.length);
data1.forEach((r, i) => console.log(i, JSON.stringify(r)));

// Sheet 3 - expenses
const ws3 = wb.Sheets['مصروفات وتحويلات'];
const data3 = x.utils.sheet_to_json(ws3, { header: 1 });
console.log('\n=== مصروفات وتحويلات - ALL ROWS ===');
console.log('Total rows:', data3.length);
data3.forEach((r, i) => console.log(i, JSON.stringify(r)));
