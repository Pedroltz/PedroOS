"""Keep a Quick Tunnel running and publish its healthy URL to the Pages Gist.

Run on the phone: GITHUB_TOKEN=<token with gist scope> python scripts/phone-tunnel.py
The backend must already listen on --origin (default http://127.0.0.1:8080).
"""
import argparse
from datetime import datetime, timezone
import json
import os
import queue
import re
import subprocess
import threading
import time
from urllib.request import Request, urlopen

GIST_ID = "f2c4bf1b6963b96f45da7b3e006ba8b6"
TUNNEL_URL = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com\b")


def healthy(origin):
    try:
        with urlopen(origin.rstrip("/") + "/healthz", timeout=8) as response:
            data = json.load(response)
            return isinstance(data, dict) and data.get("status") == "ok" and data.get("os") == "PedroOS 95"
    except (OSError, ValueError):
        return False


def publish(url, token, gist_id):
    content = json.dumps({
        "url": url,
        "fixedUrl": "https://pedroltz.github.io/PedroOS",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })
    request = Request(
        "https://api.github.com/gists/" + gist_id,
        data=json.dumps({"files": {"pedroos-tunnel.json": {"content": content}}}).encode(),
        headers={"Authorization": "Bearer " + token,
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json", "User-Agent": "PedroOS-phone"},
        method="PATCH",
    )
    with urlopen(request, timeout=20) as response:
        response.read()


def read_output(stream, lines):
    for line in stream:
        lines.put(line)


def run_tunnel(args, token):
    process = subprocess.Popen(
        [args.cloudflared, "tunnel", "--url", args.origin, "--no-autoupdate"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    lines = queue.Queue()
    threading.Thread(target=read_output, args=(process.stdout, lines), daemon=True).start()
    url = None
    published = False
    deadline = time.monotonic() + 120
    retry_at = 0
    try:
        while process.poll() is None:
            try:
                line = lines.get(timeout=1)
                print(line, end="", flush=True)
                match = TUNNEL_URL.search(line)
                if match:
                    url = match.group(0)
            except queue.Empty:
                pass
            if not published and time.monotonic() >= deadline:
                print("Tunnel did not become ready; restarting.", flush=True)
                return
            if url and not published and time.monotonic() >= retry_at:
                retry_at = time.monotonic() + 10
                if healthy(url):
                    try:
                        publish(url, token, args.gist)
                        published = True
                        print("Pages endpoint updated: " + url, flush=True)
                    except OSError as error:
                        # Never log the token or request headers.
                        print("Gist update failed (" + type(error).__name__ + "); retrying.", flush=True)
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        process.stdout.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origin", default="http://127.0.0.1:8080")
    parser.add_argument("--gist", default=GIST_ID)
    parser.add_argument("--cloudflared", default="cloudflared")
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        parser.error("Set GITHUB_TOKEN or GH_TOKEN with permission to update the Gist.")
    if not re.fullmatch(r"[a-fA-F0-9]+", args.gist):
        parser.error("Invalid Gist ID")
    try:
        while True:
            if healthy(args.origin):
                run_tunnel(args, token)
            else:
                print("Waiting for the PedroOS backend at " + args.origin, flush=True)
            time.sleep(5)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
