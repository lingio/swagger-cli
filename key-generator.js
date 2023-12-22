"use strict";

const { capitalize, isVersionId } = require("@stoplight/json-schema-ref-parser/lib/bundle/util/string");
const { safePointerToPath, parse } = require("@stoplight/json-schema-ref-parser/lib/util/url");
const { basename, extname } = require("@stoplight/path");
const { get } = require("@stoplight/json-schema-ref-parser/lib/bundle/util/object");

const MAX_ATTEMPTS = 20;

function prettify (key) {
  const subkeys = key.split('-').map(subkey => {
    return capitalize(subkey.replace(/(?:\.|[\\/]+)([a-z])?/g, (_, letter, i) => {
      if (isVersionId(subkey, letter, i)) {
        return `.${letter}`;
      }

      return letter === undefined ? i === 0 ? "" : "_" : `_${letter.toUpperCase()}`;
    }));
  });
  return subkeys.join('');
}

function suggestKey (takenKeys, key, keyPath) {
  let suggestedKey = key;
  let i = 2;

  if (takenKeys.has(suggestedKey) && !takenKeys.has(keyPath)) {
    // chances are this key is from another file so allow it once
    return suggestedKey
  }

  while (takenKeys.has(suggestedKey)) {
    suggestedKey = `${key}_${i++}`;
    if (i > MAX_ATTEMPTS) {
      throw new Error(`suggestKey: MAX_ATTEMPTS exceeded. Keys ${key}_2 through ${key}_${MAX_ATTEMPTS} already taken.`);
    }
  }

  return suggestedKey;
}

KeyGenerator.suggestKey = suggestKey;

KeyGenerator.appendSlash = function (str) {
  return str.replace(/([^/])\/?$/, "$1/");
};

function KeyGenerator (root) {
  this.root = typeof root === "function" ? root : () => root;
  this._seenSchemas = new WeakMap();
}

module.exports = KeyGenerator;

Object.assign(KeyGenerator.prototype, {
  _initializeOrReuseStateForSchema (schema) {
    let existingEntry = this._seenSchemas.get(schema);
    if (existingEntry) {
      return {
        state: existingEntry,
        reused: false,
      };
    }

    let state = {
      takenKeys: new Set(),
      generatedKeys: new Map(),
    };

    this._seenSchemas.set(schema, state);

    return {
      state,
      reused: false,
    };
  },

  getTakenKeys (schema, pathFromRoot) {
    let { state, reused } = this._initializeOrReuseStateForSchema(schema);

    if (!reused) {
      let schemaRoot = get(schema, this.root(pathFromRoot));

      if (typeof schemaRoot === "object" && schemaRoot !== null) {
        for (let key of Object.keys(schemaRoot)) {
          state.takenKeys.add(key);
        }
      }
    }
    return state.takenKeys;
  },

  isKeyTaken (schema, key, pathFromRoot) {
    return this.getTakenKeys(schema, pathFromRoot).has(key);
  },

  getGeneratedKeys (schema) {
    return this._initializeOrReuseStateForSchema(schema).state.generatedKeys;
  },

  getExistingGeneratedKey (schema, id) {
    return this.getGeneratedKeys(schema)[id];
  },

  hasExistingGeneratedKey (schema, id) {
    return id in this.getGeneratedKeys(schema);
  },

  registerNewGeneratedKey (schema, id, key, pathFromRoot) {
    let generatedKeys = this.getGeneratedKeys(schema);

    if (key === null) {
      generatedKeys[id] = key;
    }
    else {
      let takenKeys = this.getTakenKeys(schema, pathFromRoot);
      if (takenKeys.has(key)) {
        takenKeys.add(id)
      } else {
        takenKeys.add(key);
      }
      generatedKeys[id] = `${this.root(pathFromRoot)}/${key}`;
    }

    return generatedKeys[id];
  },

  getPrettifiedKeyForFilepath (filepath) {
    return prettify(basename(filepath, extname(filepath)));
  },

  generateUniqueKey (schema, key, pathFromRoot, filepath) {
    return suggestKey(this.getTakenKeys(schema, pathFromRoot), key, filepath);
  },

  generateKeyForFilepath (schema, filepath, pathFromRoot) {
    if (!this.hasExistingGeneratedKey(schema, filepath)) {
      let key = this.generateUniqueKey(schema, this.getPrettifiedKeyForFilepath(filepath), pathFromRoot, filepath);

      this.registerNewGeneratedKey(schema, filepath, key, pathFromRoot);
    }

    return this.getExistingGeneratedKey(schema, filepath);
  },

  generateKeyForUrl (schema, url, pathFromRoot) {
    if (!this.hasExistingGeneratedKey(schema, url)) {
      let { path } = parse(url, true);
      let key = path === "/" ? null : this.generateUniqueKey(schema, this.getPrettifiedKeyForFilepath(path), pathFromRoot);

      this.registerNewGeneratedKey(schema, url, key, pathFromRoot);
    }

    return this.getExistingGeneratedKey(schema, url);
  },

  generateKeyForPointer (schema, pointer, pathFromRoot) {
    if (!this.hasExistingGeneratedKey(schema, pointer)) {
      let fragment = KeyGenerator.appendSlash(this.root(pathFromRoot).slice(1));
      let actualPath = pointer.split(fragment).slice(1);
      let key = this.generateUniqueKey(schema, prettify(actualPath.join("/")), pathFromRoot);

      this.registerNewGeneratedKey(schema, pointer, key, pathFromRoot);
    }

    return this.getExistingGeneratedKey(schema, pointer);
  },

  isInRoot (pointer, pathFromRoot) {
    let parsedPointer = safePointerToPath(pointer);
    let parsedRoot = safePointerToPath(this.root(pathFromRoot));

    if (parsedRoot.length >= parsedPointer.length) {
      return false;
    }

    for (let i = parsedRoot.length - 1; i >= 0; i--) {
      if (parsedPointer[parsedPointer.length - (parsedRoot.length - i) - 1] !== parsedRoot[i]) {
        return false;
      }
    }

    return true;
  },

  isUnderDirectRoot (pointer) {
    let parsedPointer = safePointerToPath(pointer);
    let parsedRoot = safePointerToPath(this.root(pointer));

    if (parsedPointer.length !== parsedRoot.length + 1) {
      return false;
    }

    return this.isInRoot(pointer, pointer);
  }
});
