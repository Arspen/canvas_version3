import labelMap from './labelMap.json';

export function getEmojiForWord(word) {
  if (!word) return null;
  const lowerWord = word.toLowerCase();

  const matches = [];

  for (const key in labelMap) {
    if (labelMap[key].synonyms.includes(lowerWord)) {
      matches.push(labelMap[key].emoji); // Collect all matching emoji filenames
    }
  }

  if (matches.length > 0) {
    const randomIndex = Math.floor(Math.random() * matches.length);
    return matches[randomIndex]; // Return random matching emoji
  }

  return null; // No match found
}
