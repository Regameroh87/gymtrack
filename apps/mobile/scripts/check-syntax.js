// Chequeo rápido de sintaxis (JSX/ESM) de los archivos tocados por la
// migración multi-gym. Uso: node scripts/check-syntax.js
const fs = require("fs");
const parser = require("@babel/parser");

const files = process.argv.slice(2);
let failed = 0;

for (const file of files) {
  try {
    const code = fs.readFileSync(file, "utf8");
    parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx"],
    });
    console.log(`OK   ${file}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${file}: ${e.message}`);
  }
}

process.exit(failed ? 1 : 0);
