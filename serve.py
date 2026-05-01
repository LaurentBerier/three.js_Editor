"""Static server for the three.js editor with correct MIME types for ES modules."""
import http.server
import os
import socketserver

_ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(_ROOT)

# Override Windows registry MIME types that mis-label .js as text/plain.
_extensions = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
_extensions.update({
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".wasm": "application/wasm",
    ".json": "application/json",
})


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = _extensions


PORT = int(os.environ.get("PORT", "8081"))
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"three.js editor: http://localhost:{PORT}/editor/")
    httpd.serve_forever()
