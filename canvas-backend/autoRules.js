// autoRules.js  (server)
/* one ultra-simple rule:
   – fires exactly once per user, as soon as they place a word === "dolphin" (case-insensitive)
*/
module.exports = [{
    id       : 'ask-dolphin',                 // must be unique
    question : "That's a dolphin?",           // text sent to the user
    /** test(stat) → truthy  triggers the rule
        we just look at last placement (passed in param)          */
    test({ lastPlacement }) {
      return lastPlacement.word &&
             lastPlacement.word.toLowerCase() === 'dolphin';
    }
  }];
  