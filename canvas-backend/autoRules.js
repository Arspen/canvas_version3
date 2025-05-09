// server/autoRules.js
// add new rules here ↓↓↓
module.exports = [
    {
      id: 'manyAnimals',                             // unique ID
      /* text the user will see */
      question:
        'Seems like you like animals a lot! Are you starting a zoo? ' +
        'What made you place so many animals?',
      /* test(userStats) → true/false */
      test: ({ total, byCat }) =>
        total >= 10 &&                                // 10 + placements
        (byCat.Animals || 0) / total >= 0.5           // ≥ 50 % animals
    },
  
    // { id:'anotherRule', question:'…', test:stats=>… },

    {
    id       : 'repeatWord-5',
    dynamic  : true,      // question depends on which word
    test     : ({ perWord }) => {
      // look for any word that appears ≥ 5 times & whose category ≠ Elementals
      for (const [word, { count, cat }] of Object.entries(perWord)) {
        if (count >= 5 && cat !== 'Elementals') return { word };
      }
      return null;        // no match ⇒ rule does not fire
    },
    question : ({ word }) =>
      `You have placed “${word}” quite a few times. ` +
      `What’s special about it for you?`
  }
  ];
  