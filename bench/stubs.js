// Minimal DOM/jQuery/canvas stubs so the simulation modules can run under Node.
// The canvas context counts fillRect calls and fillStyle changes.
module.exports = function installStubs({ cols = 200, rows = 150 } = {}) {
    const counts = { fillRects: 0, styleChanges: 0 };
    const ctx = new Proxy({}, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (prop === 'fillRect') return () => { counts.fillRects++; };
            return () => {};
        },
        set(target, prop, val) { if (prop === 'fillStyle') counts.styleChanges++; target[prop] = val; return true; },
    });
    const canvas = { width: 0, height: 0, getContext: () => ctx, addEventListener() {} };
    global.document = {
        getElementById: () => canvas,
        querySelector: () => canvas,
        activeElement: {},
    };
    global.window = global;
    const jq = new Proxy(function () {}, {
        get(_, prop) {
            if (prop === 'height') return () => rows * 5;
            if (prop === 'width') return () => cols * 5;
            if (prop === 'is') return () => false;
            if (prop === 'css') return () => '0';
            if (prop === 'length') return 0;
            return () => jq;
        },
        apply() { return jq; },
    });
    global.$ = () => jq;
    global.alert = () => {};
    global.confirm = () => true;
    return { counts };
};
