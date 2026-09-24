"""Local dev server for the call assistant.

Use this instead of `python3 -m http.server`. The built-in server sends
Last-Modified but no Cache-Control, so Chrome caches files heuristically and
serves "fresh" copies without asking. For ES modules that is fatal: after an
edit, a new module gets linked against a stale one missing a new export, the
whole module graph fails, and the page renders blank with no visible error.

`Cache-Control: no-cache` makes the browser revalidate every file on every
load. On localhost that costs a cheap 304, and it can never serve stale code.
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    print(f"Serving {ROOT} on http://localhost:{port} (no-cache)", flush=True)
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
