import { Command } from "commander";
import subscribe from "./subscribe";
import { buildApplicationLambda, buildStub } from "./build";
import watcher from "./watcher";
import deployStub from "./deployStub";
import kleur from "kleur";
import { logger } from "./logger";
import assumeRole from "./assumeRole";
import { Credentials } from "@aws-sdk/client-sts";

const program = new Command();

program
  .name("local-lambda")
  .description("local lambda cli")
  .version("1.0.0")
  .action((options) => {
    if (options.debug) {
      logger.warn("Debug mode");
    }
  });

program
  .command("dev")
  .option("-l, --fn <fn>", "Lambda to debug")
  .action(async (opts: { fn: string }) => {
    const { fn } = opts;

    // stub
    await buildStub();
    await deployStub({ functionName: fn });

    // application
    await buildApplicationLambda();
    await watcher();

    // subscribe to IOT endpoint
    const credentials = (await assumeRole()) as Credentials;
    await subscribe({ credentials });
  });

program.parse(process.argv);
