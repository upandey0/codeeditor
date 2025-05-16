// utils/file-utils.js
const fs = require('fs');

/**
 * Cleans up temporary files
 * 
 * @param {string} filePath - Path to the file to clean up
 */
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up file:', err);
  }
};

module.exports = {
  cleanupFile
};