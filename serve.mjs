import net from 'node:net';
import { readFile } from 'node:fs/promises';

const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'number') args = [args[0], '127.0.0.1', ...args.slice(1).filter(value => typeof value !== 'string')];
  else if (args[0] && typeof args[0] === 'object') args[0] = { ...args[0], host: '127.0.0.1' };
  else throw new Error('Only loopback TCP listeners are supported.');
  return listen.apply(this, args);
};
const { runCLI } = await import('@wp-playground/cli');
const blueprint = JSON.parse(await readFile(new URL('./blueprint.json', import.meta.url), 'utf8'));
const instance = await runCLI({ command: 'server', port: 9418, 'site-url': 'http://127.0.0.1:9418', php: '8.3', wp: '7.1.4', workers: 1, blueprint, verbosity: 'quiet' });
if (instance.server.address()?.address !== '127.0.0.1') throw new Error('Unexpected bind address');
console.log('Miga WordPress demo ready: http://127.0.0.1:9418 (loopback only)');
let stopping = false;
async function stop() { if (stopping) return; stopping = true; await instance[Symbol.asyncDispose](); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
