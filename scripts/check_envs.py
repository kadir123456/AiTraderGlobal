#!/usr/bin/env python3
"""
Environment Variable Validation Script (Python version)
Checks for required environment variables and validates their format

Usage: python scripts/check_envs.py
"""

import os
import sys
import json
from typing import Dict, Callable, Optional, List, Tuple


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'


class EnvConfig:
    """Configuration for environment variable validation"""
    def __init__(
        self,
        required: bool,
        description: str,
        validator: Optional[Callable[[str], bool]] = None
    ):
        self.required = required
        self.description = description
        self.validator = validator or (lambda x: bool(x))


def validate_json(value: str) -> bool:
    """Validate JSON string"""
    try:
        parsed = json.loads(value)
        return (
            isinstance(parsed, dict) and
            parsed.get('type') == 'service_account' and
            'project_id' in parsed and
            'private_key' in parsed
        )
    except (json.JSONDecodeError, TypeError):
        return False


def validate_url(value: str, must_contain: str = '') -> bool:
    """Validate URL format"""
    if not value:
        return False
    is_valid = value.startswith('https://') or value.startswith('http://')
    if must_contain:
        is_valid = is_valid and must_contain in value
    return is_valid


def validate_port(value: str) -> bool:
    """Validate port number"""
    try:
        port = int(value)
        return 1 <= port <= 65535
    except (ValueError, TypeError):
        return False


def validate_env_mode(value: str) -> bool:
    """Validate environment mode"""
    return value in ['development', 'production', 'test']


# Required environment variables configuration
REQUIRED_ENVS: Dict[str, EnvConfig] = {
    # Firebase Configuration (CRITICAL)
    'FIREBASE_API_KEY': EnvConfig(
        required=True,
        description='Firebase Web API Key',
        validator=lambda v: len(v) > 20 if v else False
    ),
    'FIREBASE_DATABASE_URL': EnvConfig(
        required=True,
        description='Firebase Realtime Database URL',
        validator=lambda v: validate_url(v, 'firebaseio.com')
    ),
    'FIREBASE_PROJECT_ID': EnvConfig(
        required=True,
        description='Firebase Project ID',
        validator=lambda v: len(v) > 3 if v else False
    ),
    'FIREBASE_CREDENTIALS_JSON': EnvConfig(
        required=True,
        description='Firebase Admin SDK Credentials (JSON string)',
        validator=validate_json
    ),

    # JWT & Security
    'JWT_SECRET_KEY': EnvConfig(
        required=True,
        description='JWT Secret for token signing',
        validator=lambda v: len(v) >= 32 if v else False
    ),
    'ENCRYPTION_KEY': EnvConfig(
        required=True,
        description='32-character encryption key for API secrets',
        validator=lambda v: len(v) == 32 if v else False
    ),

    # Server Configuration
    'PORT': EnvConfig(
        required=False,
        description='Server port (default: 8000)',
        validator=validate_port
    ),
    'NODE_ENV': EnvConfig(
        required=False,
        description='Environment mode (development/production)',
        validator=validate_env_mode
    ),

    # Render.com Specific
    'RENDER_SERVICE_ID': EnvConfig(
        required=False,
        description='Render service identifier',
        validator=lambda v: True
    ),

    # Optional: Exchange API Keys (NOT recommended for production)
    'BINANCE_API_KEY': EnvConfig(
        required=False,
        description='Binance API Key (for testing only - use Firebase in production)',
        validator=lambda v: True
    ),
    'BINANCE_API_SECRET': EnvConfig(
        required=False,
        description='Binance API Secret (for testing only - use Firebase in production)',
        validator=lambda v: True
    ),
}


class EnvChecker:
    """Environment variable checker and validator"""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.passed: List[str] = []

    def check(self) -> bool:
        """Check all environment variables"""
        print(f'{Colors.BLUE}🔍 Checking environment variables...{Colors.END}\n')

        for key, config in REQUIRED_ENVS.items():
            value = os.getenv(key)

            if not value:
                if config.required:
                    self.errors.append(
                        f'{Colors.RED}❌ MISSING REQUIRED:{Colors.END} {key} - {config.description}'
                    )
                else:
                    self.warnings.append(
                        f'{Colors.YELLOW}⚠️  OPTIONAL MISSING:{Colors.END} {key} - {config.description}'
                    )
                continue

            # Validate format
            try:
                if not config.validator(value):
                    self.errors.append(
                        f'{Colors.RED}❌ INVALID FORMAT:{Colors.END} {key} - {config.description}'
                    )
                else:
                    self.passed.append(
                        f'{Colors.GREEN}✅ {key}{Colors.END} - {config.description}'
                    )
            except Exception as err:
                self.errors.append(
                    f'{Colors.RED}❌ VALIDATION ERROR:{Colors.END} {key} - {str(err)}'
                )

        # Additional checks
        self._check_firebase_private_key()

        self._print_results()
        return len(self.errors) == 0

    def _check_firebase_private_key(self):
        """Validate Firebase private key format"""
        cred_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
        if not cred_json:
            return

        try:
            creds = json.loads(cred_json)
            private_key = creds.get('private_key')

            if not private_key:
                self.errors.append(
                    f'{Colors.RED}❌ FIREBASE_CREDENTIALS_JSON missing private_key field{Colors.END}'
                )
                return

            # Check for proper formatting
            if '\\n' not in private_key and '\n' not in private_key:
                self.warnings.append(
                    f'{Colors.YELLOW}⚠️  Firebase private_key might be improperly formatted (missing newlines){Colors.END}'
                )

            if 'BEGIN PRIVATE KEY' not in private_key or 'END PRIVATE KEY' not in private_key:
                self.errors.append(
                    f'{Colors.RED}❌ Firebase private_key appears to be invalid (missing PEM headers){Colors.END}'
                )

        except (json.JSONDecodeError, TypeError):
            pass  # Already caught by validator

    def _print_results(self):
        """Print validation results"""
        print('\n' + '━' * 60 + '\n')

        if self.passed:
            print(f'{Colors.GREEN}✅ PASSED:{Colors.END}\n')
            for msg in self.passed:
                print(f'  {msg}')
            print()

        if self.warnings:
            print(f'{Colors.YELLOW}⚠️  WARNINGS:{Colors.END}\n')
            for msg in self.warnings:
                print(f'  {msg}')
            print()

        if self.errors:
            print(f'{Colors.RED}❌ ERRORS:{Colors.END}\n')
            for msg in self.errors:
                print(f'  {msg}')
            print()

        print('━' * 60 + '\n')

        print(f'{Colors.BOLD}📊 SUMMARY:{Colors.END}')
        print(f'  {Colors.GREEN}✅ Passed: {len(self.passed)}{Colors.END}')
        print(f'  {Colors.YELLOW}⚠️  Warnings: {len(self.warnings)}{Colors.END}')
        print(f'  {Colors.RED}❌ Errors: {len(self.errors)}{Colors.END}')
        print()

        if not self.errors:
            print(f'{Colors.GREEN}{Colors.BOLD}✅ ALL REQUIRED ENVIRONMENT VARIABLES ARE VALID!{Colors.END}\n')
        else:
            print(f'{Colors.RED}{Colors.BOLD}❌ ENVIRONMENT VALIDATION FAILED!{Colors.END}\n')
            print('Fix the errors above before deploying.\n')


def main():
    """Main entry point"""
    checker = EnvChecker()
    success = checker.check()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
