// Minimal prompt helpers. Uses readline so we avoid the inquirer dep.
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function prompt(question, defaultValue) {
  const rl = readline.createInterface({ input, output });
  try {
    const suffix = defaultValue !== undefined ? ` (${defaultValue})` : "";
    const answer = await rl.question(`? ${question}${suffix}: `);
    const trimmed = answer.trim();
    if (trimmed.length === 0 && defaultValue !== undefined) return defaultValue;
    return trimmed;
  } finally {
    rl.close();
  }
}

export async function confirm(question, defaultYes = false) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await prompt(`${question} (${hint})`, defaultYes ? "y" : "n");
  return /^y(es)?$/i.test(String(answer));
}

export async function choose(question, choices, defaultValue) {
  const labels = choices.join(" / ");
  const answer = await prompt(`${question} [${labels}]`, defaultValue);
  return choices.includes(answer) ? answer : defaultValue ?? choices[0];
}
