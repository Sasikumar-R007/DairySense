/**
 * Feed Suggestions Utility
 * 
 * Provides feed quantity suggestions based on cow type.
 */

export function getFeedSuggestion(cowType) {
  const suggestions = {
    normal: 4.5,    // Normal lactating cow
    pregnant: 2.5,  // Pregnant cow
    dry: 3.0        // Dry cow (not lactating)
  };
  
  return suggestions[cowType] || 4.5; // Default to 4.5kg if unknown type
}

