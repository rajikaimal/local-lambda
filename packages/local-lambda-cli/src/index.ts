import { Command } from "commander";
import subscribe from "./subscribe";
import { buildApplicationLambda, buildStub } from "./build";
import watcher from "./watcher";
import deployStub from "./deployStub";

const program = new Command();

program
  .name("local-lambda")
  .description("local lambda cli")
  .version("1.0.0")
  .option("-d, --debug", "Enable debug mode")
  .action((options) => {
    if (options.debug) {
      console.log("Debug mode is ON");
    } else {
      console.log("Hello, World!!!!");
    }
  });

program.command("dev").action(async () => {
  console.log("building lambda");

  // stub
  await buildStub();
  await deployStub();

  // application
  await buildApplicationLambda();
  await watcher();

  // subscribe to IOT endpoint
  await subscribe();
});

program.parse(process.argv);
