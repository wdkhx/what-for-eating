const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/87037/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main() {
  const files = process.argv.slice(2);
  for (const f of files) {
    const out = f.replace(/\.svg$/, '.png');
    await sharp(fs.readFileSync(f), {density: 144}).png().toFile(out);
    console.log(path.basename(out));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
