#!/usr/bin/env python3
"""Serve the prototype and save the PNG frames extract.html posts back.

usage: python3 server.py <frames-dir>   (prints the port it chose)
"""
import http.server, os, sys, functools
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.abspath(sys.argv[1])
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        # /save/<clip>/<n>.png  or  /done
        parts = self.path.strip("/").split("/")
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if parts[0] == "save":
            d = os.path.join(OUT, os.path.basename(parts[1])); os.makedirs(d, exist_ok=True)
            open(os.path.join(d, os.path.basename(parts[2])), "wb").write(body)
        elif parts[0] == "done":
            open(os.path.join(OUT, "_done.txt"), "wb").write(body)
        self.send_response(204); self.end_headers()
    def log_message(self, *a): pass
s = http.server.HTTPServer(("127.0.0.1", 0), functools.partial(H, directory=ROOT))
print(s.server_address[1], flush=True); s.serve_forever()
