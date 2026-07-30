import worker from '../dist/server/index.js';
import { createServerAdapter } from '@whatwg-node/server';

export default createServerAdapter(async (request) => {
  return worker.fetch(request, {}, {
    waitUntil: () => {},
    passThroughOnException: () => {}
  });
});
