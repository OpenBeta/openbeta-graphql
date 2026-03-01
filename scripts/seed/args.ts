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
  .option('alphabetical', {
    describe: 'Sort countries alphabetically',
    type: 'boolean',
    default: false,
    alias: 'a',
  })
  .option('depth', {
    describe: 'Maximum depth for area tree generation',
    type: 'number',
    default: 5,
    alias: 'd',
  })
  .option('randomness', {
    describe: 'Randomness factor for area tree generation (0-1)',
    type: 'number',
    default: 0.7,
    alias: 'r',
  })
  .option('port', {
    describe: 'Port for graph/map server',
    type: 'number',
    default: 3000,
    alias: 'p',
  })
  .option('bredth', {
    describe: 'Maximum breadth for area tree generation',
    type: 'number',
    default: 10,
    alias: 'b',
  })
  .option('countries', {
    describe: 'Limit number of countries to generate',
    type: 'number',
    default: null,
    alias: 'c',
  })
  .option('initial-scatter-radius', {
    describe: 'Initial scatter radius for area generation (km)',
    type: 'number',
    default: 10,
    alias: 's',
  })
  .help('help')
  .alias('help', 'h')
  .parseSync();
