export const BAD_WORDS = [
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "motherfucker", "whore", "slut", 
  "chutiya", "madarchod", "behenchod", "bhosdike", "gandu", "randi", "harami", "kamine", "laude", 
  "bhosadi", "muthiya", "chut", "loda", "lode", "gaandu", "jhantu", "lavde", "lawde", "chutiye"
];

/**
 * Checks if the given text contains any bad words.
 * Handles case insensitivity and basic word boundary matching.
 * @param {string} text - The text to check
 * @returns {boolean} True if bad words are found, false otherwise
 */
export const containsProfanity = (text) => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  for (const word of BAD_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText) || lowerText.includes(word)) {
      return true;
    }
  }
  
  return false;
};
