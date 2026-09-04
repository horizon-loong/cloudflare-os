// Self-contained CJS shim: exported as a callable function (module.exports = fn),
// matching how sha.js etc. consume the "inherits" package.
module.exports = function inherits(ctor, superCtor) {
  if (superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: { value: ctor, enumerable: false, writable: true, configurable: true },
    });
  }
};
