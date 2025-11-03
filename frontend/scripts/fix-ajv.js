const fs = require('fs');
const path = require('path');

function patchValidateFile(filePath, name) {
  if (fs.existsSync(filePath)) {
    console.log(`Patching ${name} to remove formatMinimum...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the line that uses formatMinimum/formatMaximum
    const replacements = [
      // Pattern 1: Direct ajvKeywords call (babel-loader format)
      {
        pattern: /ajvKeywords\(ajv, \['instanceof', 'formatMinimum', 'formatMaximum', 'patternRequired'\]\);/g,
        replacement: "ajvKeywords(ajv, ['instanceof', 'patternRequired']);"
      },
      // Pattern 2: With _ajvKeywords.default (fork-ts-checker format)
      {
        pattern: /\(0, _ajvKeywords\.default\)\(ajv, \['instanceof', 'formatMinimum', 'formatMaximum', 'patternRequired'\]\);/g,
        replacement: "(0, _ajvKeywords.default)(ajv, ['instanceof', 'patternRequired']);"
      },
      // Pattern 3: Double quotes
      {
        pattern: /ajvKeywords\(ajv, \["instanceof", "formatMinimum", "formatMaximum", "patternRequired"\]\);/g,
        replacement: 'ajvKeywords(ajv, ["instanceof", "patternRequired"]);'
      },
      {
        pattern: /\(0, _ajvKeywords\.default\)\(ajv, \["instanceof", "formatMinimum", "formatMaximum", "patternRequired"\]\);/g,
        replacement: '(0, _ajvKeywords.default)(ajv, ["instanceof", "patternRequired"]);'
      }
    ];
    
    let modified = false;
    replacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Patched ${name} successfully`);
      return true;
    } else {
      console.log(`⚠ ${name} doesn't contain the expected pattern, skipping`);
      return false;
    }
  } else {
    console.log(`⚠ ${name} not found at ${filePath}, skipping patch`);
    return false;
  }
}

// Patch fork-ts-checker-webpack-plugin
const forkTsCheckerPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'fork-ts-checker-webpack-plugin',
  'node_modules',
  'schema-utils',
  'dist',
  'validate.js'
);

// Patch babel-loader
const babelLoaderPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'babel-loader',
  'node_modules',
  'schema-utils',
  'dist',
  'validate.js'
);

console.log('Running AJV compatibility patches...');
patchValidateFile(forkTsCheckerPath, 'fork-ts-checker-webpack-plugin/schema-utils');
patchValidateFile(babelLoaderPath, 'babel-loader/schema-utils');
console.log('Patch process complete.');

