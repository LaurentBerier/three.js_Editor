"""Static server for the three.js editor with correct MIME types for ES modules."""
import errno
import http.server
import os

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


class _Server(http.server.ThreadingHTTPServer):
    # Default socketserver backlog is 5 - way too low for the editor's burst of
    # ~100 parallel module fetches. Without this, SYNs past 5 get RST'd by the
    # kernel and the browser sees ERR_CONNECTION_REFUSED on random files.
    request_queue_size = 256
    daemon_threads = True


def _addr_in_use(err: OSError) -> bool:
    if err.errno == errno.EADDRINUSE:
        return True
    # Windows: WinError 10048 (EADDRINUSE) and 10013 (access denied / port reserved)
    if getattr(err, "winerror", None) in (10013, 10048):
        return True
    return False


def _bind(start_port: int, attempts: int = 30):
    """Return (server, actual_port). Tries start_port, start_port+1, ..."""
    last_err = None
    for p in range(start_port, start_port + attempts):
        try:
            return _Server(("", p), Handler), p
        except OSError as e:
            if _addr_in_use(e):
                last_err = e
                continue
            raise
    raise OSError(
        f"No free port in {start_port}-{start_port + attempts - 1}. "
        "Close the other server or set PORT to an open port."
    ) from last_err


WANT_PORT = int(os.environ.get("PORT", "8081"))
httpd, BOUND_PORT = _bind(WANT_PORT)
with httpd:
    if BOUND_PORT != WANT_PORT:
        print(f"Port {WANT_PORT} was busy - using {BOUND_PORT} instead.")
    print(f"three.js editor: http://localhost:{BOUND_PORT}/editor/")
    httpd.serve_forever()
