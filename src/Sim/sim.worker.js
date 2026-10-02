// Web Worker entry: the simulation runs here, off the UI thread. The same code
// also runs on the main thread as a fallback (see createWorker.runOnThisThread),
// where slices are kept shorter because that thread also draws.
const createHost = require('./SimHost');

const host = createHost((msg, transfer) => self.postMessage(msg, transfer || []),
                        { budget: self.__lifeEngineMainThread ? 8 : 12 });
self.onmessage = (e) => host(e.data);
