(function () {
  'use strict';

  var modes = {};
  var order = [];

  function mergeMode(child, parent) {
    var merged = {};
    var key;
    for (key in parent) {
      if (Object.prototype.hasOwnProperty.call(parent, key)) merged[key] = parent[key];
    }
    for (key in child) {
      if (!Object.prototype.hasOwnProperty.call(child, key)) continue;
      if (key === 'flags' && parent.flags) {
        merged.flags = Object.assign({}, parent.flags, child.flags);
      } else {
        merged[key] = child[key];
      }
    }
    return merged;
  }

  window.GameModes = {
    register: function (mode) {
      if (!mode || !mode.id) return;
      modes[mode.id] = mode;
      if (order.indexOf(mode.id) === -1) order.push(mode.id);
    },

    get: function (id) {
      var mode = modes[id];
      if (!mode) return null;
      if (!mode.extends) return mode;
      var parent = modes[mode.extends];
      if (!parent) return mode;
      return mergeMode(mode, parent);
    },

    list: function () {
      return order.map(function (id) {
        var m = modes[id];
        return {
          id: m.id,
          name: m.name,
          desc: m.desc,
          hint: m.hint
        };
      });
    },

    ids: function () {
      return order.slice();
    }
  };
})();
