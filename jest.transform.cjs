const ts = require('typescript');

module.exports = {
  process(source, filename) {
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        sourceMap: true,
      },
      fileName: filename,
    });
    return { code: result.outputText, map: result.sourceMapText };
  },
};
