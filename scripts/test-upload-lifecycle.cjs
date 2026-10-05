const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise provider callbacks with deferred parsing, without a browser or network.
function harness() {
  const updates = [], cleanup = [], parses = [];
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useContext: () => null,
    useState: initial => { let value = initial; return [value, next => {
      value = typeof next === 'function' ? next(value) : next;
      updates.push(value);
    }]; },
    useRef: value => ({ current: value }),
    useCallback: fn => fn,
    useEffect: fn => { const dispose = fn(); if (dispose) cleanup.push(dispose); },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../context/TelemetryContext.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, setTimeout, clearTimeout, AbortController,
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (_, props) => props };
      if (name.includes('telemetry/parser')) return { parseFile: () => new Promise((resolve,reject) => parses.push({resolve,reject})) };
      return {};
    },
  });
  return { api: exports.TelemetryProvider({ children: null }).value, updates, parses, cleanup };
}

(async () => {
  const first = harness();
  const pending = first.api.handleFile({ size: 10, name: 'old.csv' });
  first.api.reset();
  const count = first.updates.length;
  first.parses[0].resolve({});
  await pending;
  assert.equal(first.updates.length, count, 'Reset must invalidate an in-flight parse');

  const second = harness();
  const old = second.api.handleFile({ size: 10, name: 'old.csv' });
  await second.api.handleFile({ size: 51 * 1024 * 1024, name: 'new.csv' });
  const before = second.updates.length;
  second.parses[0].reject(new Error('stale failure'));
  await old;
  assert.equal(second.updates.length, before, 'Old errors must not replace a newer selection');

  const third = harness();
  const unmounted = third.api.handleFile({ size: 10, name: 'unmounted.csv' });
  third.cleanup.forEach(fn => fn());
  const afterUnmount = third.updates.length;
  third.parses[0].resolve({});
  await unmounted;
  assert.equal(third.updates.length, afterUnmount, 'Unmount must invalidate pending work');
  console.log('Passed: reset during parsing, superseded errors, unmount during parsing');
})().catch(error => { console.error(error); process.exitCode = 1; });
