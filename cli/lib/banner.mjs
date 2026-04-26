// Block-letter ASCII banner shown at the top of `npx agent-ready` setup and help.
// Generated with `figlet "agent-ready" -f Big`. Kept dependency free.
const CLI_BANNER = [
  "",
  "                         _                             _       ",
  "                        | |                           | |      ",
  "   __ _  __ _  ___ _ __ | |_ ______ _ __ ___  __ _  __| |_   _ ",
  "  / _` |/ _` |/ _ \\ '_ \\| __|______| '__/ _ \\/ _` |/ _` | | | |",
  " | (_| | (_| |  __/ | | | |_       | | |  __/ (_| | (_| | |_| |",
  "  \\__,_|\\__, |\\___|_| |_|\\__|      |_|  \\___|\\__,_|\\__,_|\\__, |",
  "         __/ |                                            __/ |",
  "        |___/                                            |___/ ",
  "",
].join("\n");

export function printCliBanner() {
  console.log(CLI_BANNER);
}
