/**
 * This file was written to provide documentation and easy reference while going through
 * JavaScript tutorials.
 *
 *
 * How to run in terminal:
 *   node JSTutorial.js
 */

// Tells the interpreter to interpret code in a "stricter" way (i.e. not allowing errors to happen silently, type enforcement, etc.)
"use strict";

/* =========================================================
=  SECTION 0 — QUICK JS VS PYTHON ORIENTATION
========================================================= */
/**
 * - Indentation: not syntax-significant (unlike Python).
 * - Variables: use `let` and `const`; avoid `var` (outdated)
 * - Equality: strict equality (`===`) checks types and values, while loose equality (`==`) will convert types to match, then checks values.
 * - Functions: functions can be treated as a variable (nested functions and callback functions).
 * - Arrow Functions: Makes passing in anonymous functions as callback functions much easier
 * - Objects: Objects are essentially just Python dictionaries, but `Map` and `Set` data strictures also exist.
 * - Modules: Node supports CommonJS (require/module.exports) and ES Modules (import/export).
 */

/* =========================================================
=  SECTION 1 — VARIABLES: let, const, (don't use var)
========================================================= */

// `const` variables cannot be reassigned (but object contents can be changed)
const COURSE = "CS 307";
// DON'T do this:
// COURSE = "CS 180";


let course = "CS 307";
// Perfectly okay:
course = "CS 180";

// Don't use var

/* =========================================================
=  SECTION 2 — TYPES & TYPEOF QUIRKS
========================================================= */

const n = 123;                 // number (no separate integer/floating-point types)
const x = 3.14;                // number
const s = "hello";             // string
const b = true;                // boolean
const u = undefined;           // undefined
const nul = null;              // null

console.log("[S2] typeof 123:", typeof n);
console.log("[S2] typeof 'hello':", typeof s);
console.log("[S2] typeof true:", typeof b);
console.log("[S2] typeof undefined:", typeof u);
console.log("[S2] typeof null (quirk):", typeof nul); // "object" (historic bug in JS)

/* =========================================================
=  SECTION 3 — EQUALITY: === vs ==
========================================================= */

// Always use === (strict equality)
console.log("1" == 1);    // true (type casting)
console.log("1" === 1);   // false (no type casting)

/* =========================================================
=  SECTION 4 — STRINGS & TEMPLATE LITERALS
========================================================= */

const name = "Logan";
const msg = `Hi ${name}, welcome to ${COURSE}! 2 + 3 = ${2 + 3}`; // Note: Backticks used when inserting varaible values
console.log("[S4] Template literal:", msg);

// Common methods:
console.log("[S4] '  trim  '.trim():", "  trim  ".trim());  // Trim leading and trailing whitespace
console.log("[S4] 'abc'.includes('b'):", "abc".includes("b"));  // Checks if substring exists in string

/* =========================================================
=  SECTION 5 — ARRAYS: map, filter, reduce
========================================================= */

// Note: arrays can be of different types, like in Python
const my_arr = [1, 2, 3, 4, 5];

// map: transform each element (like Python list comprehensions)
const squared = my_arr.map((v) => v * v);
console.log("[S5] my_arr.map() squared:", squared);

// filter: keep elements where predicate is true
const evens = my_arr.filter((v) => v % 2 === 0);
console.log("[S5] my_arr.filter() evens:", evens);

// reduce: fold to a single value
const sum = my_arr.reduce((acc, v) => acc + v, 0);
console.log("[S5] my_arr.reduce() sum:", sum);

// Some other handy methods
console.log("[S5] my_arr.find(v>3):", my_arr.find((v) => v > 3));   // 4
console.log("[S5] my_arr.some(v%2===0):", my_arr.some((v) => v % 2 === 0)); // true
console.log("[S5] my_arr.every(v>0):", my_arr.every((v) => v > 0)); // true

/* =========================================================
=  SECTION 6 — OBJECTS (like Python dicts) & DESTRUCTURING
========================================================= */

const user = {
  id: 7,
  username: "student_dev",
  profile: { first: "Logan", last: "Portscheller" },
};

console.log("[S6] user.username:", user.username);
console.log("[S6] user['id']:", user["id"]);

// Destructuring
const { username, profile: { first, last } } = user;
console.log("[S6] destructured:", username, first, last);

// Optional chaining & nullish coalescing
const middle = user.profile?.middle ?? "(no middle name)";
console.log("[S6] optional chaining + ?? :", middle);

// Shallow copy with spread
const userCopy = { ...user, active: true };
console.log("[S6] spread copy:", userCopy);

/* =========================================================
=  SECTION 7 — FUNCTIONS vs ARROW FUNCTIONS (and `this`)
========================================================= */

/**
 * In Python, inner functions close over outer variables.
 * JS also has closures (see Section 9).
 *
 * `function` (declaration or expression):
 *  - Has its own `this` when called as obj.method() (dynamic based on call site)
 *  - Can be used with `new` as a constructor (if designed so)
 *
 * Arrow functions:
 *  - Shorter syntax
 *  - `this` is *lexically* captured (inherits from surrounding scope), not rebinding
 *  - Not constructible with `new`
 */

const obj = {
  label: "MyObject",
  regularMethod: function () {
    return `[regularMethod] this.label = ${this.label}`;
  },
  arrowMethod: () => {
    // In an arrow, `this` is not the object above; it’s lexically scoped (here: module/global).
    // So `this.label` is likely undefined.
    return `[arrowMethod] this.label = ${/* @ts-ignore */ this?.label}`;
  },
};

console.log("[S7]", obj.regularMethod()); // uses obj as this
console.log("[S7]", obj.arrowMethod());   // `this` not bound to obj — likely undefined

// Arrow function examples:
const add = (a, b) => a + b;                  // concise body
const toPairs = (arr) => arr.map((x) => [x, x]);
console.log("[S7] add(2,3):", add(2, 3), "| toPairs:", toPairs([1, 2]));

/* =========================================================
=  SECTION 8 — SCOPE: block vs function
========================================================= */

if (true) {
  let blockScoped = "I exist only inside this block";
  // var functionScoped = "I exist across the function (avoid var)";
  // console.log(blockScoped); // ok
}
// console.log(blockScoped); // ReferenceError: not defined

/* =========================================================
=  SECTION 9 — CLOSURES (Inner function remembers outer scope)
========================================================= */

function makeCounter(start = 0) {
  let count = start; // private “captured” variable
  return function () {
    count += 1;
    return count;
  };
}

const counterA = makeCounter();
console.log("[S9] counterA()", counterA()); // 1
console.log("[S9] counterA()", counterA()); // 2

/* =========================================================
=  SECTION 10 — DEFAULT PARAMS, REST, SPREAD
========================================================= */

// Default params
function greet(who = "world") {
  return `Hello, ${who}!`;
}
console.log("[S10] greet():", greet(), "| greet('Logan'):", greet("Logan"));

// Rest parameters (like *args in Python)
function sumAll(...nums) {
  return nums.reduce((a, v) => a + v, 0);
}
console.log("[S10] sumAll(1,2,3,4):", sumAll(1, 2, 3, 4));

// Spread arrays/objects
const base = [10, 20];
const extended = [...base, 30, 40];
console.log("[S10] spread array:", extended);

const baseObj = { x: 1, y: 2 };
const extendedObj = { ...baseObj, y: 99, z: 3 }; // y overridden
console.log("[S10] spread object:", extendedObj);

/* =========================================================
=  SECTION 11 — LOOPS: for, for..of, for..in
========================================================= */

const letters = ["a", "b", "c"];

// Classic for
for (let i = 0; i < letters.length; i++) {
  if (i === 0) console.log("[S11] for i:", i, letters[i]);
}

// for..of iterates values (arrays, strings, etc.)
for (const ch of letters) {
  if (ch === "a") console.log("[S11] for..of value:", ch);
}

// for..in iterates keys (use for objects, not arrays, generally)
for (const key in user) {
  if (Object.prototype.hasOwnProperty.call(user, key)) {
    if (key === "username") console.log("[S11] for..in key:", key, user[key]);
  }
}

/* =========================================================
=  SECTION 12 — CLASSES, PROTOTYPES & INHERITANCE
========================================================= */

class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a noise.`;
  }
  static kingdom() {
    return "Animalia";
  }
}

class Dog extends Animal {
  speak() {
    return `${this.name} barks.`;
  }
}

const d = new Dog("Buddy");
console.log("[S12] dog.speak():", d.speak(), "| Animal.kingdom():", Animal.kingdom());

/* =========================================================
=  SECTION 13 — ERROR HANDLING
========================================================= */

function mustBePositive(n) {
  if (n <= 0) throw new Error("n must be > 0");
  return Math.sqrt(n);
}

try {
  console.log("[S13] sqrt(9):", mustBePositive(9));
  // mustBePositive(-1); // would throw
} catch (err) {
  console.error("[S13] Caught error:", err.message);
} finally {
  // Always runs
  if (true) {} // placeholder
}

/* =========================================================
=  SECTION 14 — PROMISES & ASYNC/AWAIT
========================================================= */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function demoAsync() {
  console.log("[S14] Starting async work…");
  await delay(100); // in real code, you might fetch data or do I/O
  return "[S14] Done after ~100ms";
}

// Since top-level await may require ESM, use an IIFE in CommonJS:
(async () => {
  const doneMsg = await demoAsync();
  console.log(doneMsg);
})();

/* =========================================================
=  SECTION 15 — MAP, SET (when plain objects/arrays aren’t ideal)
========================================================= */

const seen = new Set([1, 2, 2, 3]); // deduplicates
seen.add(3).add(4);
console.log("[S15] Set has 2?", seen.has(2), "| size:", seen.size);

const counts = new Map();
counts.set("apple", 2).set("banana", 5);
console.log("[S15] Map get banana:", counts.get("banana"));

/* =========================================================
=  SECTION 16 — JSON, DATES, & INTL
========================================================= */

const payload = { ok: true, items: [1, 2, 3] };
const json = JSON.stringify(payload); // to string
const parsed = JSON.parse(json);      // back to object
console.log("[S16] JSON roundtrip ok?", parsed.ok && parsed.items.length === 3);

const now = new Date();
console.log("[S16] Date ISO:", now.toISOString());

// Example Intl formatting (locale-aware)
const amount = 1234.56;
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
console.log("[S16] Intl USD:", usd);

/* =========================================================
=  SECTION 17 — SHORT-CIRCUITING, OPTIONAL CHAINING, NULLISH
========================================================= */

const config = { retries: 0, nested: { flag: true } };
console.log("[S17] AND short-circuit:", config.nested && config.nested.flag); // true
console.log("[S17] OR fallback:", "" || "fallback"); // "fallback" because "" is falsy

// Optional chaining (?.) avoids crashes if a step is null/undefined
console.log("[S17] config?.deep?.missing:", config?.deep?.missing); // undefined (safe)

// Nullish coalescing (??) only uses rhs if lhs is null/undefined (NOT for 0 or "")
console.log("[S17] retries with ?? :", config.retries ?? 3); // 0 (kept), not 3

/* =========================================================
=  SECTION 18 — MODULES OVERVIEW (commented demo)
========================================================= */
/**
 * Node has two systems:
 *  1) CommonJS (default historically): 
 *     const lib = require('./lib');
 *     module.exports = { foo };
 *
 *  2) ES Modules (modern):
 *     // package.json: { "type": "module" }
 *     export function foo() {}
 *     import { foo } from './lib.js';
 *
 * This file is written to run as a single script. If I split it into modules,
 * I’d choose ESM for new projects.
 */

/* =========================================================
=  SECTION 19 — MISC SYNTAX DIFFS (JS vs Python)
========================================================= */
/**
 * - No `in` for membership on arrays (use .includes), but `in` iterates object keys.
 * - Ternary: cond ? a : b
 * - Switch: switch (value) { case 1: ...; break; default: ... }
 * - No list comprehensions; use map/filter or reduce.
 * - Truthiness differs (see falsy list).
 * - Try not to rely on implicit type coercion.
 */

// Examples:
console.log("[S19] [1,2,3].includes(2):", [1, 2, 3].includes(2)); // true

// Ternary:
const age = 20;
const canDrink = age >= 21 ? "no (US law)" : "nope yet"; // playful demo
console.log("[S19] Ternary result:", canDrink);

// Switch:
const code = "JS";
switch (code) {
  case "PY":
    console.log("[S19] Python selected");
    break;
  case "JS":
    console.log("[S19] JavaScript selected");
    break;
  default:
    console.log("[S19] Unknown");
}

/* =========================================================
=  SECTION 20 — PROTOTYPE CHAIN (just enough to not be spooked)
========================================================= */
/**
 * Every object has an internal [[Prototype]] (often accessed via Object.getPrototypeOf()).
 * Class methods live on the prototype, so all instances share them (memory efficient).
 */

const protoDemo = Object.getPrototypeOf(d); // d is Dog instance
console.log("[S20] Dog instance prototype has speak?", "speak" in protoDemo);

/* =========================================================
=  SECTION 21 — LITTLE PRACTICE CHALLENGE (end-to-end)
========================================================= */
/**
 * Goal: given an array of mixed values, return a cleaned summary:
 *  - Keep only numbers
 *  - Square each
 *  - Sum them
 *  - Return an object { count, sum, avg }
 */

function summarizeSquares(values) {
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  const squares = nums.map((v) => v * v);
  const total = squares.reduce((a, v) => a + v, 0);
  const count = squares.length;
  const avg = count ? total / count : 0;
  return { count, sum: total, avg };
}

console.log("[S21] summarizeSquares:", summarizeSquares([1, "2", 3, null, 4, NaN, 5]));

/* =========================================================
=  SECTION 22 — FINAL FLAG TO “PROVE I DID THE TUTORIAL”
========================================================= */

const tutorialCompleted = true;
console.log("[S22] tutorialCompleted:", tutorialCompleted);

/* ========================================================= */