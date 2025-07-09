// Language service for handling API calls to the languages endpoints
import apiClient from './api';

export interface Language {
  code: string;
  name: string;
  native_name: string;
  is_rtl: boolean;
  flag_code: string;
  display_order: number;
}

// Cache for languages
let languagesCache: Language[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Default fallback languages when API call fails
const DEFAULT_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native_name: 'English', is_rtl: false, flag_code: 'us', display_order: 1 },
  { code: 'ru', name: 'Russian', native_name: 'Русский', is_rtl: false, flag_code: 'ru', display_order: 2 },
  { code: 'ar', name: 'Arabic', native_name: 'العربية', is_rtl: true, flag_code: 'sa', display_order: 3 },
  { code: 'tr', name: 'Turkish', native_name: 'Türkçe', is_rtl: false, flag_code: 'tr', display_order: 4 },
  { code: 'zh', name: 'Chinese', native_name: '中文', is_rtl: false, flag_code: 'cn', display_order: 5 }
];

/**
 * Fetch all active languages from the API
 */
export async function getLanguages(): Promise<Language[]> {
  // Check cache first
  const now = Date.now();
  if (languagesCache && now - lastFetchTime < CACHE_DURATION) {
    console.log("Using cached languages data");
    return languagesCache;
  }
  
  console.log("Fetching languages from API...");
  
  try {
    // Log the API URL for debugging
    console.log("API URL for languages:", `${apiClient.defaults.baseURL}/languages/`);
    
    // Use any type for more flexibility with responses
    const response = await apiClient.get<any>('/languages/');
    
    // Log response details to help debugging
    console.log("API Response status:", response.status);
    console.log("API Response data type:", typeof response.data);
    
    // Ensure we have an array
    let languages: Language[] = [];
    
    if (Array.isArray(response.data)) {
      // Direct array response
      languages = response.data;
      console.log("Received languages array with", languages.length, "items");
    } else if (response.data && typeof response.data === 'object') {
      // The API might be returning a wrapper object with results
      if (Array.isArray(response.data.results)) {
        languages = response.data.results;
        console.log("Extracted languages from results array with", languages.length, "items");
      } else {
        console.warn("Response data is an object but doesn't contain a results array:", response.data);
      }
    } else {
      console.warn("Unexpected response format:", response.data);
    }
    
    // Validate language objects and filter out invalid ones
    languages = languages.filter(lang => {
      const isValid = lang && 
                    typeof lang === 'object' && 
                    typeof lang.code === 'string' &&
                    typeof lang.native_name === 'string';
      if (!isValid) {
        console.warn("Filtering out invalid language object:", lang);
      }
      return isValid;
    });
    
    // Sort by display order if we have any languages
    if (languages.length > 0) {
      try {
        languages.sort((a: Language, b: Language) => 
          (a.display_order || 999) - (b.display_order || 999)
        );
        console.log("Languages sorted by display order");
      } catch (sortError) {
        console.error("Error sorting languages:", sortError);
      }
    }
    
    // If we didn't get any languages, use defaults
    if (languages.length === 0) {
      console.warn("No valid languages returned from API, using defaults");
      languages = [...DEFAULT_LANGUAGES];
    }
    
    // Update cache
    languagesCache = languages;
    lastFetchTime = now;
    
    return languages;
  } catch (error) {
    console.error("Error fetching languages:", error);
    // Fallback to hardcoded values if API call fails
    return [...DEFAULT_LANGUAGES];
  }
}

/**
 * Clear the languages cache
 */
export function clearLanguagesCache(): void {
  languagesCache = null;
  lastFetchTime = 0;
  console.log("Languages cache cleared");
}
