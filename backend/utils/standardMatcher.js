/**
 * Normalizes standard/class strings for flexible matching.
 * Examples:
 *  "1" <-> "1st" <-> "Grade 1" <-> "Class 1" <-> "Std 1" <-> "1st Class"
 *  "2" <-> "2nd" <-> "Grade 2" <-> "Class 2" <-> "Std 2" <-> "2nd Class"
 *  "10" <-> "10th" <-> "Grade 10" <-> "Class 10" <-> "10th Class"
 */

function getStandardKey(stdStr) {
  if (stdStr === null || stdStr === undefined) return "";
  let s = String(stdStr).trim().toLowerCase();

  // Remove common prefix words: grade, class, std, standard
  s = s.replace(/\b(grade|class|std|standard)\b/gi, "").trim();

  // Convert ordinal numbers to digits: 1st -> 1, 2nd -> 2, 3rd -> 3, 4th -> 4, 11th -> 11
  s = s.replace(/(\d+)(st|nd|rd|th)/gi, "$1").trim();

  // Remove non-alphanumeric characters
  s = s.replace(/[^a-z0-9]/gi, "");

  return s;
}

/**
 * Finds a matching standard object from an array of DB standards.
 * Returns the matching standard object from `dbStandards`, or null if no match found.
 */
function findMatchingStandard(inputStd, dbStandards) {
  if (!inputStd || !Array.isArray(dbStandards) || dbStandards.length === 0) return null;
  const trimmedInput = String(inputStd).trim();

  // 1. Direct exact match (case-insensitive)
  const exactMatch = dbStandards.find(s => s.std && s.std.trim().toLowerCase() === trimmedInput.toLowerCase());
  if (exactMatch) return exactMatch;

  // 2. Normalized key match
  const inputKey = getStandardKey(trimmedInput);
  if (!inputKey) return null;

  const keyMatch = dbStandards.find(s => s.std && getStandardKey(s.std) === inputKey);
  if (keyMatch) return keyMatch;

  return null;
}

module.exports = {
  getStandardKey,
  findMatchingStandard
};
