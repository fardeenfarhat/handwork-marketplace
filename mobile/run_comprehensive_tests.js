#!/usr/bin/env node
/**
 * Comprehensive test runner for React Native mobile app
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description, options = {}) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Running: ${description}`, 'blue');
  log(`Command: ${command}`, 'blue');
  log(`${'='.repeat(60)}`, 'cyan');
  
  const startTime = Date.now();
  
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: options.timeout || 300000, // 5 minutes default
      ...options
    });
    
    const duration = (Date.now() - startTime) / 1000;
    log(`Duration: ${duration.toFixed(2)} seconds`, 'green');
    log(`✅ ${description} completed successfully`, 'green');
    
    return true;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    log(`Duration: ${duration.toFixed(2)} seconds`, 'red');
    log(`❌ ${description} failed`, 'red');
    log(`Error: ${error.message}`, 'red');
    
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const options = {
    unit: args.includes('--unit'),
    integration: args.includes('--integration'),
    e2e: args.includes('--e2e'),
    performance: args.includes('--performance'),
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    updateSnapshots: args.includes('--updateSnapshots') || args.includes('-u')
  };
  
  // Change to mobile directory
  process.chdir(__dirname);
  
  const results = {};
  
  // Base jest command
  let baseCmd = 'npx jest';
  if (options.verbose) {
    baseCmd += ' --verbose';
  }
  if (options.coverage) {
    baseCmd += ' --coverage';
  }
  if (options.watch) {
    baseCmd += ' --watch';
  }
  if (options.updateSnapshots) {
    baseCmd += ' --updateSnapshot';
  }
  
  log('Starting Comprehensive Mobile App Tests', 'magenta');
  
  // Run specific test categories or all tests
  if (options.unit) {
    const success = runCommand(
      `${baseCmd} --testPathPattern="__tests__/(components|hooks|services|utils)" --testPathIgnorePatterns="e2e|performance"`,
      'Unit Tests'
    );
    results['Unit Tests'] = success;
  } else if (options.integration) {
    const success = runCommand(
      `${baseCmd} --testPathPattern="__tests__/integration"`,
      'Integration Tests'
    );
    results['Integration Tests'] = success;
  } else if (options.e2e) {
    const success = runCommand(
      `${baseCmd} --testPathPattern="__tests__/e2e"`,
      'End-to-End Tests'
    );
    results['End-to-End Tests'] = success;
  } else if (options.performance) {
    const success = runCommand(
      `${baseCmd} --testPathPattern="__tests__/performance"`,
      'Performance Tests'
    );
    results['Performance Tests'] = success;
  } else {
    // Run all test categories
    const testCategories = [
      ['Unit Tests', '--testPathPattern="__tests__/(components|hooks|services|utils)" --testPathIgnorePatterns="e2e|performance"'],
      ['Integration Tests', '--testPathPattern="__tests__/integration"'],
      ['End-to-End Tests', '--testPathPattern="__tests__/e2e"'],
      ['Performance Tests', '--testPathPattern="__tests__/performance"']
    ];
    
    for (const [categoryName, testPattern] of testCategories) {
      const success = runCommand(
        `${baseCmd} ${testPattern}`,
        categoryName
      );
      results[categoryName] = success;
    }
  }
  
  // Additional quality checks
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('Running Additional Quality Checks', 'blue');
  log(`${'='.repeat(60)}`, 'cyan');
  
  // ESLint check
  const lintSuccess = runCommand(
    'npx eslint src/ --ext .js,.jsx,.ts,.tsx',
    'Code Linting (ESLint)'
  );
  results['Code Linting'] = lintSuccess;
  
  // TypeScript type checking
  const typeCheckSuccess = runCommand(
    'npx tsc --noEmit',
    'Type Checking (TypeScript)'
  );
  results['Type Checking'] = typeCheckSuccess;
  
  // Prettier format check
  const formatSuccess = runCommand(
    'npx prettier --check "src/**/*.{js,jsx,ts,tsx,json,md}"',
    'Code Formatting (Prettier)'
  );
  results['Code Formatting'] = formatSuccess;
  
  // Generate final report
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('COMPREHENSIVE TEST RESULTS', 'magenta');
  log(`${'='.repeat(60)}`, 'cyan');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(success => success).length;
  
  for (const [testName, success] of Object.entries(results)) {
    const status = success ? '✅ PASSED' : '❌ FAILED';
    const color = success ? 'green' : 'red';
    log(`${testName.padEnd(30)} ${status}`, color);
  }
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`SUMMARY: ${passedTests}/${totalTests} test categories passed`, 'blue');
  
  if (passedTests === totalTests) {
    log('🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runCommand, main };