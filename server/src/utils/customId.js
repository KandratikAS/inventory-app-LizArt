const { v4: uuidv4 } = require('uuid');

/**
 * Generate a custom ID string from a format array.
 * @param {Array} format 
 * @param {number} sequenceValue 
 * @returns {string}
 */
function generateCustomId(format, sequenceValue = 1) {
  if (!Array.isArray(format) || format.length === 0) {
    // Default: 6-digit zero-padded sequence
    return String(sequenceValue).padStart(6, '0');
  }

  return format
    .map((part) => {
      switch (part.type) {
        case 'fixed':
          return String(part.value || '');

        case 'random20': {
          const n = Math.floor(Math.random() * 1048576);
          return part.padded ? String(n).padStart(part.padLength || 7, '0') : String(n);
        }

        case 'random32': {
          const n = Math.floor(Math.random() * 4294967296);
          return part.padded ? String(n).padStart(part.padLength || 10, '0') : String(n);
        }

        case 'random6':
          return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

        case 'random9':
          return String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');

        case 'guid':
          return uuidv4();

        case 'datetime': {
          const now = new Date();
          const yyyy = now.getUTCFullYear();
          const MM = String(now.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(now.getUTCDate()).padStart(2, '0');
          const HH = String(now.getUTCHours()).padStart(2, '0');
          const mm = String(now.getUTCMinutes()).padStart(2, '0');
          const ss = String(now.getUTCSeconds()).padStart(2, '0');
          return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
        }

        case 'sequence': {
          const val = sequenceValue;
          return part.padded
            ? String(val).padStart(part.padLength || 6, '0')
            : String(val);
        }

        default:
          return '';
      }
    })
    .join('');
}


function previewCustomId(format) {
  if (!Array.isArray(format) || format.length === 0) return '000001';
  return format
    .map((part) => {
      switch (part.type) {
        case 'fixed': return part.value || '';
        case 'random20': {
          const val = Math.floor(Math.random() * 1048575);
          return part.padded ? String(val).padStart(part.padLength || 7, '0') : String(val);
        }
        case 'random32': {
          const val = Math.floor(Math.random() * 4294967295);
          return part.padded ? String(val).padStart(part.padLength || 10, '0') : String(val);
        }
        case 'random6': return String(Math.floor(Math.random() * 900000) + 100000);
        case 'random9': return String(Math.floor(Math.random() * 900000000) + 100000000);
        case 'guid': return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        case 'datetime': return new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
        case 'sequence': return part.padded ? '1'.padStart(part.padLength || 6, '0') : '1';
        default: return '';
      }
    })
    .join('');
}

module.exports = { generateCustomId, previewCustomId };