#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Checks for required environment variables and validates their format
 *
 * Usage: node scripts/check_envs.js
 */

const requiredEnvs = {
  // Firebase Configuration (CRITICAL)
  FIREBASE_API_KEY: {
    required: true,
    description: 'Firebase Web API Key',
    validator: (val) => val && val.length > 20
  },
  FIREBASE_DATABASE_URL: {
    required: true,
    description: 'Firebase Realtime Database URL',
    validator: (val) => val && val.startsWith('https://') && val.includes('firebaseio.com')
  },
  FIREBASE_PROJECT_ID: {
    required: true,
    description: 'Firebase Project ID',
    validator: (val) => val && val.length > 3
  },
  FIREBASE_CREDENTIALS_JSON: {
    required: true,
    description: 'Firebase Admin SDK Credentials (JSON string)',
    validator: (val) => {
      if (!val) return false;
      try {
        const parsed = JSON.parse(val);
        return parsed.type === 'service_account' && parsed.project_id && parsed.private_key;
      } catch {
        return false;
      }
    }
  },

  // JWT & Security
  JWT_SECRET_KEY: {
    required: true,
    description: 'JWT Secret for token signing',
    validator: (val) => val && val.length >= 32
  },
  ENCRYPTION_KEY: {
    required: true,
    description: '32-character encryption key for API secrets',
    validator: (val) => val && val.length === 32
  },

  // Server Configuration
  PORT: {
    required: false,
    description: 'Server port (default: 8000)',
    validator: (val) => !val || (!isNaN(val) && parseInt(val) > 0)
  },
  NODE_ENV: {
    required: false,
    description: 'Environment mode (development/production)',
    validator: (val) => !val || ['development', 'production', 'test'].includes(val)
  },

  // Render.com Specific
  RENDER_SERVICE_ID: {
    required: false,
    description: 'Render service identifier',
    validator: () => true
  },

  // Optional: Exchange API Keys for Testing (not stored in env, use Firebase)
  // These are ONLY for initial testing, production keys should be in Firebase
  BINANCE_API_KEY: {
    required: false,
    description: 'Binance API Key (for testing only)',
    validator: () => true
  },
  BINANCE_API_SECRET: {
    required: false,
    description: 'Binance API Secret (for testing only)',
    validator: () => true
  }
};

class EnvChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  check() {
    console.log('🔍 Checking environment variables...\n');

    for (const [key, config] of Object.entries(requiredEnvs)) {
      const value = process.env[key];

      if (!value) {
        if (config.required) {
          this.errors.push(`❌ MISSING REQUIRED: ${key} - ${config.description}`);
        } else {
          this.warnings.push(`⚠️  OPTIONAL MISSING: ${key} - ${config.description}`);
        }
        continue;
      }

      // Validate format
      try {
        if (config.validator && !config.validator(value)) {
          this.errors.push(`❌ INVALID FORMAT: ${key} - ${config.description}`);
        } else {
          this.passed.push(`✅ ${key} - ${config.description}`);
        }
      } catch (err) {
        this.errors.push(`❌ VALIDATION ERROR: ${key} - ${err.message}`);
      }
    }

    this.printResults();
    return this.errors.length === 0;
  }

  printResults() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (this.passed.length > 0) {
      console.log('✅ PASSED:\n');
      this.passed.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:\n');
      this.warnings.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    if (this.errors.length > 0) {
      console.log('❌ ERRORS:\n');
      this.errors.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 SUMMARY:');
    console.log(`  ✅ Passed: ${this.passed.length}`);
    console.log(`  ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`  ❌ Errors: ${this.errors.length}`);
    console.log('');

    if (this.errors.length === 0) {
      console.log('✅ ALL REQUIRED ENVIRONMENT VARIABLES ARE VALID!\n');
    } else {
      console.log('❌ ENVIRONMENT VALIDATION FAILED!\n');
      console.log('Fix the errors above before deploying.\n');
    }
  }

  checkFirebasePrivateKey() {
    const credJson = process.env.FIREBASE_CREDENTIALS_JSON;
    if (!credJson) return;

    try {
      const creds = JSON.parse(credJson);
      const privateKey = creds.private_key;

      if (!privateKey) {
        this.errors.push('❌ FIREBASE_CREDENTIALS_JSON missing private_key field');
        return;
      }

      // Check for proper formatting (should have \n as actual newlines or \\n)
      if (!privateKey.includes('\n') && !privateKey.includes('\\n')) {
        this.warnings.push('⚠️  Firebase private_key might be improperly formatted (missing newlines)');
      }

      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        this.errors.push('❌ Firebase private_key appears to be invalid (missing PEM headers)');
      }
    } catch (err) {
      // Already caught by validator
    }
  }
}

// Run the checker
const checker = new EnvChecker();
checker.checkFirebasePrivateKey();
const success = checker.check();

process.exit(success ? 0 : 1);
