import http.server
import socketserver
import os

PORT = 1234
DIRECTORY = "frontend"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        try:
            if len(args) >= 3:
                print(f"[{self.log_date_time_string()}] {args[0]} {args[1]} {args[2]}")
            else:
                print(f"[{self.log_date_time_string()}] {format % args}")
        except Exception:
            print(f"[{self.log_date_time_string()}] {args}")

if __name__ == "__main__":
    print(f"\n  CipherVault Demo Server\n")
    print(f"  Local:   http://localhost:{PORT}/login.html")
    print(f"  Docs:    http://localhost:{PORT}/login.html\n")
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
