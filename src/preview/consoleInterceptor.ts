/**
 * Console Interceptor - Script to inject into preview iframe.
 * Intercepts console calls and sends them to parent window.
 */

export const CONSOLE_INTERCEPTOR_SCRIPT = `
(function() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    table: console.table,
    clear: console.clear,
  };
  
  function serialize(arg) {
    if (arg === undefined) return 'undefined';
    if (arg === null) return 'null';
    if (typeof arg === 'function') return arg.toString();
    if (typeof arg === 'symbol') return arg.toString();
    if (arg instanceof Error) return arg.stack || arg.message;
    if (arg instanceof Date) return arg.toISOString();
    if (arg instanceof RegExp) return arg.toString();
    if (arg instanceof Map) return 'Map(' + arg.size + ')';
    if (arg instanceof Set) return 'Set(' + arg.size + ')';
    if (arg instanceof WeakMap) return 'WeakMap';
    if (arg instanceof WeakSet) return 'WeakSet';
    if (arg instanceof Promise) return 'Promise';
    if (arg instanceof Array) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return '[Array]';
      }
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return '[Object]';
      }
    }
    return String(arg);
  }
  
  function sendToParent(type, args) {
    const timestamp = Date.now();
    const serializedArgs = Array.from(args).map(serialize);
    
    window.parent.postMessage({
      type: 'console-log',
      logType: type,
      args: serializedArgs,
      timestamp: timestamp,
    }, '*');
    
    // Also call original
    try {
      originalConsole[type].apply(console, args);
    } catch (e) {
      // Fallback for browsers that throw on console.table with certain args
      originalConsole.log.apply(console, args);
    }
  }
  
  console.log = function() { sendToParent('log', arguments); };
  console.error = function() { sendToParent('error', arguments); };
  console.warn = function() { sendToParent('warn', arguments); };
  console.info = function() { sendToParent('info', arguments); };
  console.debug = function() { sendToParent('debug', arguments); };
  console.table = function() { sendToParent('table', arguments); };
  console.clear = function() {
    window.parent.postMessage({ type: 'console-clear' }, '*');
    originalConsole.clear();
  };
  
  // Also capture uncaught errors
  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type: 'console-log',
      logType: 'error',
      args: [e.message + ' (line ' + e.lineno + ')'],
      timestamp: Date.now(),
    }, '*');
  });
  
  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({
      type: 'console-log',
      logType: 'error',
      args: ['Unhandled Promise Rejection: ' + String(e.reason)],
      timestamp: Date.now(),
    }, '*');
  });
})();
`

/**
 * The script as a string to inject into the preview document.
 * This is already in string form for direct injection.
 */
export function getConsoleInterceptorScript(): string {
  return CONSOLE_INTERCEPTOR_SCRIPT
}