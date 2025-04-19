import labelMap from './labelMap.json';

export function getEmojiForWord(inputWord) {
  const word = inputWord.toLowerCase();

  for (const [label, data] of Object.entries(labelMap)) {
    if (data.synonyms.includes(word)) {
      return data.emoji;
    }
  }

  return null; // no emoji found, fallback to raw text
}
