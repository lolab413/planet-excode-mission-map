export const ACTIVITY_ID = 'system-reboot-core-concepts';
export const PROGRESS_KEY = `planet-excode-${ACTIVITY_ID}-progress-v1`;
export const COMPLETION_KEY = 'planet-excode-word-search-completed-v1';
export const CONCEPTS = {
  SYSTEM: 'A system is a group of connected parts that work together.',
  LOGIC: 'Logic is a set of rules that helps a system make decisions.',
  DATA: 'Data is information, such as numbers or words, that a system can use.',
  POWER: 'Power is the energy a system needs to run.',
  INPUT: 'Input is information or instructions sent into a system.',
  OUTPUT: 'Output is the result a system sends back, such as a picture or sound.'
};

export function lineBetween(a, b) {
  if (![a, b].every(i => Number.isInteger(i) && i >= 0 && i < 100)) return [];
  const r = Math.floor(a / 10), c = a % 10;
  const dr = Math.floor(b / 10) - r, dc = b % 10 - c;
  if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return [];
  return Array.from({ length: Math.max(Math.abs(dr), Math.abs(dc)) + 1 }, (_, i) => (r + Math.sign(dr) * i) * 10 + c + Math.sign(dc) * i);
}

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function createBoard(random = Math.random) {
  const letters = Array(100).fill('');
  const solutions = {};
  // Backtracking guarantees every concept is placed, including on unlucky shuffles.
  const words = shuffle(Object.keys(CONCEPTS), random);
  function place(n) {
    if (n === words.length) return true;
    const word = words[n], candidates = [];
    for (let start = 0; start < 100; start++) {
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const r = Math.floor(start / 10) + dr * (word.length - 1), c = start % 10 + dc * (word.length - 1);
        if (r < 0 || r > 9 || c < 0 || c > 9) continue;
        const indices = lineBetween(start, r * 10 + c);
        if (indices.every((i, j) => !letters[i] || letters[i] === word[j])) candidates.push(indices);
      }
    }
    for (const indices of shuffle(candidates, random)) {
      const empty = indices.filter(i => !letters[i]);
      indices.forEach((i, j) => letters[i] = word[j]); solutions[word] = indices;
      if (place(n + 1)) return true;
      empty.forEach(i => letters[i] = ''); delete solutions[word];
    }
    return false;
  }
  if (!place(0)) throw new Error('Unable to create word search');
  return { activityId: ACTIVITY_ID, letters: letters.map(letter => letter || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(random() * 26)]), solutions, found: [] };
}

export function validProgress(saved) {
  return saved?.activityId === ACTIVITY_ID && Array.isArray(saved.letters) && saved.letters.length === 100 &&
    saved.letters.every(letter => typeof letter === 'string' && /^[A-Z]$/.test(letter)) &&
    Array.isArray(saved.found) && saved.found.every(word => Object.hasOwn(CONCEPTS, word)) &&
    Object.keys(CONCEPTS).every(word => {
      const indices = saved.solutions?.[word];
      return Array.isArray(indices) && indices.length === word.length &&
        JSON.stringify(indices) === JSON.stringify(lineBetween(indices[0], indices.at(-1))) &&
        indices.map(i => saved.letters[i]).join('') === word;
    });
}
