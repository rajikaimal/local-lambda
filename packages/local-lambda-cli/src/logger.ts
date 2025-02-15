import kleur from "kleur";

export const logger = {
  info: (...args: any) => console.log(kleur.blue(args)),
  warn: (...args: any) => console.log(kleur.red(args)),
  debug: (...args: any) => console.log(kleur.bgYellow(args)),
  error: (...args: any) => console.log(kleur.bgRed(args)),
};
