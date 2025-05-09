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
  ];
  