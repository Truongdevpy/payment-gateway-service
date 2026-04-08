import argparse
import json
import os
import sys
from datetime import datetime, timedelta

from mbbank_api import MBBankAPI


def _default_from_date() -> str:
    return (datetime.now() - timedelta(days=7)).strftime("%d/%m/%Y")


def _default_to_date() -> str:
    return datetime.now().strftime("%d/%m/%Y")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CLI demo for MBBankAPI.")
    parser.add_argument("--username", default=os.getenv("MB_USERNAME", "TRUONGNGUYEN021105"))
    parser.add_argument("--password", default=os.getenv("MB_PASSWORD", "Xuantruong@123321"))
    parser.add_argument("--account-no", default=os.getenv("MB_ACCOUNT_NO", "0868133346"))
    parser.add_argument("--from-date", default=os.getenv("MB_FROM_DATE", _default_from_date()))
    parser.add_argument("--to-date", default=os.getenv("MB_TO_DATE", _default_to_date()))
    parser.add_argument("--captcha", help="Manual captcha value for a single run.")
    parser.add_argument("--skip-balance", action="store_true", help="Skip balance API and only fetch transactions.")
    parser.add_argument("--export-session", action="store_true", help="Print session info after login.")
    return parser


def _configure_stdio() -> None:
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream and hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def _pretty_print(data) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    _configure_stdio()
    args = _build_parser().parse_args()

    if args.captcha:
        os.environ["MB_CAPTCHA"] = args.captcha.strip().upper()

    api = MBBankAPI.auto_login(username=args.username, password=args.password)
    print("[OK] Login success")

    if args.export_session:
        print("[OK] Session:")
        _pretty_print(api.export_session())

    if not args.skip_balance:
        print("[OK] Balance:")
        _pretty_print(api.get_balance())

    print("[OK] Transactions:")
    _pretty_print(
        api.get_transactions(
            account_no=args.account_no,
            from_date=args.from_date,
            to_date=args.to_date,
        )
    )
