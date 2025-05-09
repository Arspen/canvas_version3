// autoRules.js  (server)
/* one ultra-simple rule:
   – fires exactly once per user, as soon as they place a word === "dolphin" (case-insensitive)
*/
/*
module.exports = [{
    id       : 'ask-dolphin',                 // must be unique
    question : "That's a dolphin?",           // text sent to the user
    /** test(stat) → truthy  triggers the rule
        we just look at last placement (passed in param)          */
/*    test({ lastPlacement }) {
      return lastPlacement.word &&
             lastPlacement.word.toLowerCase() === 'dolphin';
    }
  }];
  */
  const CATEGORY_COLOURS = {
    Animals: '#f5bf17',
    Nature: '#05c274',
    Elemental: '#094542',
    Humanoid: '#85d5f6',
    Objects: '#4750dd',
    Structures: '#212161',
    Food_Drinks: '#d3a4ea',
    Unknown: '#ed564f',
    Communication: '#a24571',
  };
  
  module.exports = [{
      id: 'repeat-object-10',
      question: "I've noticed you often use the word: ", // Basic template
      dynamic: true,
      test: ({
        wordCounts
      }) => {
        for (const [word, count] of Object.entries(wordCounts)) {
          if (count >= 3) {
            return {
              word
            };
          }
        }
        return null;
      },
    },
    {
      id: 'dominant-category',
      question: "I've noticed your language often leans towards ", // Basic template
      dynamic: true,
      test: ({
        total,
        categoryCounts
      }) => {
        if (total < 10) return false;
  
        let dominantCategory = null;
        let maxCount = 0;
        for (const category in categoryCounts) {
          if (category === 'Elemental') continue; // Exclude Elemental
          if (categoryCounts[category] > maxCount) {
            maxCount = categoryCounts[category];
            dominantCategory = category;
          }
        }
        if (dominantCategory && maxCount / total >= 0.5) {
          return {
            category: dominantCategory
          };
        }
        return null;
      },
    },
    {
      id: 'hotspot-activity',
      question: "You've been working intently over there, your own little hot spot on the map. Can you share a bit about what you've been creating? What does it mean to you?",
      test: ({
        heatmapDensity
      }) => {
        // This is a placeholder. The actual logic will depend on how you calculate 'heatmapDensity'.
        // You'll likely need to pass data derived from your HeatMap.jsx equivalent.
        return heatmapDensity > 5; // Example threshold - adjust as needed
      },
    },
  ];