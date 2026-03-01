import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const argv = yargs(hideBin(process.argv))
  .scriptName('seed')
  .usage('Usage: bun scripts/fake-seed.ts [options]')
  .option('graph', {
    describe: 'Run graph server',
    type: 'boolean',
    default: false,
  })
  .option('map', {
    describe: 'Run map server',
    type: 'boolean',
    default: false,
  })
  .option('onlyserver', {
    describe: 'Skip actual seeding',
    type: 'boolean',
    default: false,
  })
  .option('verbose', {
    describe: 'Enable verbose logging',
    type: 'boolean',
    default: false,
    alias: 'v',
  })
  .option('querylog', {
    describe: 'Enable query logging',
    type: 'boolean',
    default: false,
  })
  .option('port', {
    describe: 'Port for graph/map server',
    type: 'number',
    default: 3000,
    alias: 'p',
  })
  .help('help')
  .alias('help', 'h')
  .parseSync();
