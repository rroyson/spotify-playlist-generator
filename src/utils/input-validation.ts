/**
 * Input validation and sanitization utilities for OpenAI prompts
 * Prevents prompt injection attacks and API abuse
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedPrompt?: string;
}

export interface PromptInputs {
  prompt: string;
  songCount: number;
  personalityMode: string;
}

// Valid personality modes allowed in the system
export const VALID_PERSONALITY_MODES = [
  'default',
  'mainstream', 
  'discovery',
  'nostalgia',
  'experimental'
] as const;

// Prompt validation constants
export const PROMPT_MIN_LENGTH = 10;
export const PROMPT_MAX_LENGTH = 1000;
export const SONG_COUNT_MIN = 1;
export const SONG_COUNT_MAX = 50;

// Suspicious patterns that might indicate prompt injection attempts
const SUSPICIOUS_PATTERNS = [
  /ignore.*(previous|above|earlier).*(instruction|prompt|rule)/i,
  /system.*prompt/i,
  /override.*instruction/i,
  /forget.*(previous|above|earlier).*(instruction|prompt|rule)/i,
  /disregard.*(previous|above|earlier).*(instruction|prompt|rule)/i,
  /now.*act.*as/i,
  /pretend.*you.*are/i,
  /roleplay.*as/i,
  /new.*system.*message/i,
  /change.*your.*role/i,
  /you.*are.*now/i,
  /assistant.*mode.*off/i,
  /disable.*safety/i,
  /bypass.*filter/i,
];

/**
 * Sanitizes user input by removing potentially harmful characters and normalizing whitespace
 */
export function sanitizePrompt(prompt: string): string {
  if (typeof prompt !== 'string') {
    return '';
  }

  return prompt
    .trim()
    .replace(/[<>\"'`]/g, '') // Remove potential script injection chars
    .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
    .replace(/\s+/g, ' '); // Normalize whitespace (must be after other replacements)
}

/**
 * Validates prompt input for security issues and suspicious patterns
 */
export function validatePrompt(prompt: string): string[] {
  const errors: string[] = [];

  if (!prompt || typeof prompt !== 'string') {
    errors.push('Prompt is required and must be a string');
    return errors;
  }

  const trimmedPrompt = prompt.trim();

  if (trimmedPrompt.length < PROMPT_MIN_LENGTH) {
    errors.push(`Prompt must be at least ${PROMPT_MIN_LENGTH} characters long`);
  }

  if (trimmedPrompt.length > PROMPT_MAX_LENGTH) {
    errors.push(`Prompt must be less than ${PROMPT_MAX_LENGTH} characters`);
  }

  // Check for suspicious patterns that might indicate injection attempts
  const matchedPattern = SUSPICIOUS_PATTERNS.find(pattern => pattern.test(trimmedPrompt));
  if (matchedPattern) {
    errors.push('Prompt contains invalid content');
    // Log suspicious activity for monitoring (without exposing the actual content)
    console.warn('Suspicious prompt pattern detected:', {
      pattern: matchedPattern.source,
      promptLength: trimmedPrompt.length,
      timestamp: new Date().toISOString()
    });
  }

  return errors;
}

/**
 * Validates song count parameter
 */
export function validateSongCount(songCount: unknown): string[] {
  const errors: string[] = [];

  if (typeof songCount !== 'number') {
    errors.push('Song count must be a number');
    return errors;
  }

  if (!Number.isInteger(songCount)) {
    errors.push('Song count must be a whole number');
  }

  if (songCount < SONG_COUNT_MIN) {
    errors.push(`Song count must be at least ${SONG_COUNT_MIN}`);
  }

  if (songCount > SONG_COUNT_MAX) {
    errors.push(`Song count must be no more than ${SONG_COUNT_MAX}`);
  }

  return errors;
}

/**
 * Validates personality mode parameter
 */
export function validatePersonalityMode(personalityMode: unknown): string[] {
  const errors: string[] = [];

  if (typeof personalityMode !== 'string') {
    errors.push('Personality mode must be a string');
    return errors;
  }

  if (!VALID_PERSONALITY_MODES.includes(personalityMode as any)) {
    errors.push(`Invalid personality mode. Must be one of: ${VALID_PERSONALITY_MODES.join(', ')}`);
  }

  return errors;
}

/**
 * Comprehensive validation of all prompt inputs
 */
export function validatePromptInputs({ prompt, songCount, personalityMode }: PromptInputs): ValidationResult {
  const errors: string[] = [];

  // Validate each input
  errors.push(...validatePrompt(prompt));
  errors.push(...validateSongCount(songCount));
  errors.push(...validatePersonalityMode(personalityMode));

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  // If validation passes, return sanitized prompt
  return {
    isValid: true,
    errors: [],
    sanitizedPrompt: sanitizePrompt(prompt)
  };
}