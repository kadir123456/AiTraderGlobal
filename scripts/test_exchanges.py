#!/usr/bin/env python3
"""
Exchange Integration Test Script
Tests connectivity and basic operations for all exchanges

Usage: python scripts/test_exchanges.py [exchange_name]
If no exchange specified, tests all configured exchanges
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services import (
    binance_service,
    bybit_service,
    okx_service,
    kucoin_service,
    mexc_service
)


class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'


class ExchangeTester:
    """Test exchange connectivity and operations"""

    def __init__(self):
        self.results = {}

    async def test_exchange(
        self,
        exchange_name: str,
        api_key: str,
        api_secret: str,
        passphrase: str = ""
    ):
        """Test a single exchange"""
        print(f'\n{Colors.CYAN}━━━ Testing {exchange_name.upper()} ━━━{Colors.END}\n')

        result = {
            'exchange': exchange_name,
            'timestamp': datetime.utcnow().isoformat(),
            'tests': {}
        }

        # Test 1: Get Balance
        print(f'  🔍 Test 1: Fetching account balance...')
        try:
            if exchange_name == 'binance':
                balance = await binance_service.get_balance(api_key, api_secret, is_futures=True)
            elif exchange_name == 'bybit':
                balance = await bybit_service.get_balance(api_key, api_secret, is_futures=True)
            elif exchange_name == 'okx':
                balance = await okx_service.get_balance(api_key, api_secret, is_futures=True, passphrase=passphrase)
            elif exchange_name == 'kucoin':
                balance = await kucoin_service.get_balance(api_key, api_secret, is_futures=True, passphrase=passphrase)
            elif exchange_name == 'mexc':
                balance = await mexc_service.get_balance(api_key, api_secret, is_futures=True)
            else:
                print(f'    {Colors.RED}❌ Unsupported exchange{Colors.END}')
                return

            print(f'    {Colors.GREEN}✅ Balance fetched successfully{Colors.END}')
            print(f'       Total: {balance.get("total", 0)} {balance.get("currency", "USDT")}')
            print(f'       Available: {balance.get("available", 0)} {balance.get("currency", "USDT")}')
            result['tests']['balance'] = {'success': True, 'data': balance}

        except Exception as e:
            print(f'    {Colors.RED}❌ Failed: {str(e)}{Colors.END}')
            result['tests']['balance'] = {'success': False, 'error': str(e)}

        # Test 2: Get Current Price
        print(f'\n  🔍 Test 2: Fetching BTCUSDT price...')
        try:
            symbol = 'BTCUSDT'

            if exchange_name == 'binance':
                price = await binance_service.get_current_price(api_key, api_secret, symbol, is_futures=True)
            elif exchange_name == 'bybit':
                price = await bybit_service.get_current_price(api_key, api_secret, symbol, is_futures=True)
            elif exchange_name == 'okx':
                symbol = 'BTC-USDT-SWAP'  # OKX format
                price = await okx_service.get_current_price(api_key, api_secret, symbol, is_futures=True, passphrase=passphrase)
            elif exchange_name == 'kucoin':
                symbol = 'XBTUSDTM'  # KuCoin futures format
                price = await kucoin_service.get_current_price(api_key, api_secret, symbol, is_futures=True, passphrase=passphrase)
            elif exchange_name == 'mexc':
                price = await mexc_service.get_current_price(api_key, api_secret, symbol, is_futures=True)

            print(f'    {Colors.GREEN}✅ Price fetched successfully{Colors.END}')
            print(f'       {symbol}: ${price:,.2f}')
            result['tests']['price'] = {'success': True, 'data': {'symbol': symbol, 'price': price}}

        except Exception as e:
            print(f'    {Colors.RED}❌ Failed: {str(e)}{Colors.END}')
            result['tests']['price'] = {'success': False, 'error': str(e)}

        # Test 3: Get Open Positions
        print(f'\n  🔍 Test 3: Fetching open positions...')
        try:
            if exchange_name == 'binance':
                positions = await binance_service.get_positions(api_key, api_secret, is_futures=True)
            elif exchange_name == 'bybit':
                positions = await bybit_service.get_positions(api_key, api_secret, is_futures=True)
            elif exchange_name == 'okx':
                positions = await okx_service.get_positions(api_key, api_secret, is_futures=True, passphrase=passphrase)
            elif exchange_name == 'kucoin':
                positions = await kucoin_service.get_positions(api_key, api_secret, is_futures=True, passphrase=passphrase)
            elif exchange_name == 'mexc':
                positions = await mexc_service.get_positions(api_key, api_secret, is_futures=True)

            print(f'    {Colors.GREEN}✅ Positions fetched successfully{Colors.END}')
            print(f'       Open positions: {len(positions)}')
            if positions:
                for pos in positions:
                    print(f'       - {pos.get("symbol")}: {pos.get("side")} {pos.get("amount")} @ {pos.get("entry_price")}')
            result['tests']['positions'] = {'success': True, 'data': {'count': len(positions), 'positions': positions}}

        except Exception as e:
            print(f'    {Colors.RED}❌ Failed: {str(e)}{Colors.END}')
            result['tests']['positions'] = {'success': False, 'error': str(e)}

        # Summary
        print(f'\n{Colors.CYAN}━━━ {exchange_name.upper()} Summary ━━━{Colors.END}')
        total_tests = len(result['tests'])
        passed_tests = sum(1 for t in result['tests'].values() if t.get('success'))

        if passed_tests == total_tests:
            print(f'{Colors.GREEN}✅ All tests passed ({passed_tests}/{total_tests}){Colors.END}')
        else:
            print(f'{Colors.YELLOW}⚠️  Some tests failed ({passed_tests}/{total_tests} passed){Colors.END}')

        self.results[exchange_name] = result
        return result

    async def test_all_exchanges(self):
        """Test all configured exchanges from environment"""
        print(f'{Colors.BOLD}{Colors.BLUE}╔══════════════════════════════════════════╗{Colors.END}')
        print(f'{Colors.BOLD}{Colors.BLUE}║   Exchange Integration Test Suite      ║{Colors.END}')
        print(f'{Colors.BOLD}{Colors.BLUE}╚══════════════════════════════════════════╝{Colors.END}')

        exchanges_to_test = []

        # Check for configured exchanges in environment
        if os.getenv('BINANCE_API_KEY') and os.getenv('BINANCE_API_SECRET'):
            exchanges_to_test.append(('binance', os.getenv('BINANCE_API_KEY'), os.getenv('BINANCE_API_SECRET'), ''))

        if os.getenv('BYBIT_API_KEY') and os.getenv('BYBIT_API_SECRET'):
            exchanges_to_test.append(('bybit', os.getenv('BYBIT_API_KEY'), os.getenv('BYBIT_API_SECRET'), ''))

        if os.getenv('OKX_API_KEY') and os.getenv('OKX_API_SECRET') and os.getenv('OKX_PASSPHRASE'):
            exchanges_to_test.append(('okx', os.getenv('OKX_API_KEY'), os.getenv('OKX_API_SECRET'), os.getenv('OKX_PASSPHRASE')))

        if os.getenv('KUCOIN_API_KEY') and os.getenv('KUCOIN_API_SECRET') and os.getenv('KUCOIN_PASSPHRASE'):
            exchanges_to_test.append(('kucoin', os.getenv('KUCOIN_API_KEY'), os.getenv('KUCOIN_API_SECRET'), os.getenv('KUCOIN_PASSPHRASE')))

        if os.getenv('MEXC_API_KEY') and os.getenv('MEXC_API_SECRET'):
            exchanges_to_test.append(('mexc', os.getenv('MEXC_API_KEY'), os.getenv('MEXC_API_SECRET'), ''))

        if not exchanges_to_test:
            print(f'\n{Colors.YELLOW}⚠️  No exchange API keys found in environment variables{Colors.END}')
            print(f'\nSet environment variables like:')
            print(f'  BINANCE_API_KEY=your_key')
            print(f'  BINANCE_API_SECRET=your_secret')
            print(f'\nOr use Firebase storage for production.')
            return

        print(f'\n{Colors.BLUE}Found {len(exchanges_to_test)} configured exchange(s){Colors.END}\n')

        for exchange_name, api_key, api_secret, passphrase in exchanges_to_test:
            await self.test_exchange(exchange_name, api_key, api_secret, passphrase)
            await asyncio.sleep(1)  # Rate limiting

        # Final Summary
        print(f'\n{Colors.BOLD}{Colors.BLUE}╔══════════════════════════════════════════╗{Colors.END}')
        print(f'{Colors.BOLD}{Colors.BLUE}║        Final Test Summary               ║{Colors.END}')
        print(f'{Colors.BOLD}{Colors.BLUE}╚══════════════════════════════════════════╝{Colors.END}\n')

        for exchange_name, result in self.results.items():
            total = len(result['tests'])
            passed = sum(1 for t in result['tests'].values() if t.get('success'))
            status = f'{Colors.GREEN}✅' if passed == total else f'{Colors.YELLOW}⚠️ '
            print(f'{status} {exchange_name.upper():<10} {passed}/{total} tests passed{Colors.END}')


async def main():
    """Main entry point"""
    tester = ExchangeTester()

    if len(sys.argv) > 1:
        exchange_name = sys.argv[1].lower()
        api_key = input(f'Enter {exchange_name.upper()} API Key: ').strip()
        api_secret = input(f'Enter {exchange_name.upper()} API Secret: ').strip()
        passphrase = ''

        if exchange_name in ['okx', 'kucoin']:
            passphrase = input(f'Enter {exchange_name.upper()} Passphrase: ').strip()

        await tester.test_exchange(exchange_name, api_key, api_secret, passphrase)
    else:
        await tester.test_all_exchanges()


if __name__ == '__main__':
    asyncio.run(main())
