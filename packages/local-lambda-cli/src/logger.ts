import kleur from "kleur";

const format = (args: unknown[]) =>
  args
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join(" ");

export const logger = {
  info: (...args: unknown[]) => console.log(kleur.white(format(args))),
  warn: (...args: unknown[]) => console.log(kleur.red(format(args))),
  debug: (...args: unknown[]) => console.log(kleur.bgYellow(format(args))),
  error: (...args: unknown[]) => console.log(kleur.bgRed(format(args))),
};
