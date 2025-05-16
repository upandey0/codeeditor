// utils/sanitizer.js
/**
 * Sanitizes code input to prevent dangerous operations
 * 
 * @param {string} code - The code to sanitize
 * @returns {string} - Sanitized code
 */
const sanitizeInput = (code) => {
  // Basic sanitization
  return code
    .replace(/import os/g, '# import os not allowed')
    .replace(/import sys/g, '# import sys not allowed')
    .replace(/import subprocess/g, '# import subprocess not allowed')
    .replace(/exec\(/g, '# exec() not allowed')
    .replace(/eval\(/g, '# eval() not allowed')
    .replace(/while\s+True/g, 'while False # infinite loops not allowed');
};

module.exports = {
  sanitizeInput
};