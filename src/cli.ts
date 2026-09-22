import { CommandFactory } from 'nest-commander';

import { CliModule } from './cli/cli.module';

async function bootstrap() {
  if (process.argv[2] === '--') {
    process.argv.splice(2, 1);
  }

  await CommandFactory.run(CliModule);
}

bootstrap();
