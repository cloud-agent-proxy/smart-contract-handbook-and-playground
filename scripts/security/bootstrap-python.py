#!/usr/bin/env python3
"""Update this interpreter's pip/certifi securely, or check with --check.

Use inside the virtual environment intended for this project. The pip wheel
hash is from the Python security team's 2026-10-20 advisory. No application
dependencies are upgraded by this helper.
"""
import argparse
import importlib
import importlib.metadata
import re
import ssl
import subprocess
import sys

PIP_SPEC = 'pip @ https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl#sha256=fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70'
FLOORS = {"pip": (26, 2, 2), "certifi": (2026, 10, 19)}
BAD_ROOT = "emSign ECC Root CA - G3"

def version(name):
    try:
        raw = importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return (), "not installed"
    if not re.fullmatch(r"[0-9]+(?:[.][0-9]+)*", raw):
        return (), raw  # Do not accept prereleases as a patched stable release.
    return tuple(map(int, raw.split("."))), raw

def check():
    failures = []
    for name, floor in FLOORS.items():
        current, raw = version(name)
        print(f"{name}={raw}")
        if current < floor:
            failures.append(f"{name} must be >= {'.'.join(map(str, floor))}")
    if not failures:
        for module_name in ("certifi", "pip._vendor.certifi"):
            bundle = importlib.import_module(module_name).where()
            context = ssl.create_default_context(cafile=bundle)
            for certificate in context.get_ca_certs():
                if any(value == BAD_ROOT for rdn in certificate["subject"] for key, value in rdn if key == "commonName"):
                    failures.append(f"{module_name} still trusts {BAD_ROOT}")
    if failures:
        print("; ".join(failures), file=sys.stderr)
        return 1
    print("Python package and CA baselines satisfied")
    return 0

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="read-only validation; never install packages")
    args = parser.parse_args()
    if args.check:
        return check()
    if version("pip")[0] < FLOORS["pip"]:
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", PIP_SPEC], check=True)
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "certifi>=2026.10.19"], check=True)
    # Validate in a fresh process, avoiding modules cached before the upgrade.
    return subprocess.call([sys.executable, __file__, "--check"])

if __name__ == "__main__":
    raise SystemExit(main())
