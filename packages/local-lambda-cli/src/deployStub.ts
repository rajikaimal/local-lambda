import { deployStack } from "./stub/bin/app";

const deployStub = async ({ functionName }: { functionName: string }) => {
  await deployStack({ functionName });
};

export default deployStub;
