from __future__ import annotations

import ipaddress
import socket
import struct
from urllib.parse import urljoin, urlparse

import httpx


class UnsafeSourceUrl(RuntimeError):
    pass


class MalwareDetected(RuntimeError):
    pass


def _host_is_public(hostname: str) -> bool:
    if hostname.lower() in {"localhost", "localhost.localdomain"}:
        return False
    try:
        addresses = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise UnsafeSourceUrl(f"Could not resolve source host: {hostname}") from exc
    if not addresses:
        raise UnsafeSourceUrl(f"Source host resolved to no addresses: {hostname}")
    for item in addresses:
        raw = item[4][0]
        ip = ipaddress.ip_address(raw)
        if not ip.is_global:
            return False
    return True


def validate_public_http_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise UnsafeSourceUrl("Only HTTP(S) source URLs are allowed")
    if not parsed.hostname or parsed.username or parsed.password:
        raise UnsafeSourceUrl("Source URL must have a normal public hostname and no embedded credentials")
    if parsed.port and parsed.port not in {80, 443}:
        raise UnsafeSourceUrl("Non-standard source URL ports are blocked")
    if not _host_is_public(parsed.hostname):
        raise UnsafeSourceUrl("Source URL resolves to a private, loopback, link-local or otherwise non-public address")
    return url


def fetch_public_source(url: str, *, max_bytes: int, timeout_seconds: float = 60.0, max_redirects: int = 5) -> tuple[bytes, str, httpx.Headers]:
    current = validate_public_http_url(url)
    headers = {"User-Agent": "GroundedKnowledgeBot/1.0 (+source-refresh)"}
    timeout = httpx.Timeout(timeout_seconds, connect=min(15.0, timeout_seconds))
    with httpx.Client(follow_redirects=False, timeout=timeout, headers=headers) as client:
        for _ in range(max_redirects + 1):
            validate_public_http_url(current)
            with client.stream("GET", current) as response:
                if response.status_code in {301, 302, 303, 307, 308}:
                    location = response.headers.get("location")
                    if not location:
                        raise UnsafeSourceUrl("Redirect response did not include a Location header")
                    current = urljoin(current, location)
                    continue
                response.raise_for_status()
                length = response.headers.get("content-length")
                if length and int(length) > max_bytes:
                    raise RuntimeError(f"Source exceeds maximum allowed size of {max_bytes} bytes")
                body = bytearray()
                for chunk in response.iter_bytes(chunk_size=64 * 1024):
                    body.extend(chunk)
                    if len(body) > max_bytes:
                        raise RuntimeError(f"Source exceeds maximum allowed size of {max_bytes} bytes")
                return bytes(body), str(response.url), response.headers
    raise UnsafeSourceUrl(f"Source exceeded {max_redirects} redirects")


def scan_with_clamav(payload: bytes, host: str, port: int, timeout_seconds: float = 30.0) -> None:
    """Scan bytes using clamd's INSTREAM protocol. Raises on malware or scanner errors."""
    with socket.create_connection((host, port), timeout=timeout_seconds) as sock:
        sock.settimeout(timeout_seconds)
        sock.sendall(b"zINSTREAM\0")
        view = memoryview(payload)
        for offset in range(0, len(payload), 64 * 1024):
            chunk = view[offset : offset + 64 * 1024]
            sock.sendall(struct.pack("!I", len(chunk)))
            sock.sendall(chunk)
        sock.sendall(struct.pack("!I", 0))
        response = bytearray()
        while True:
            piece = sock.recv(4096)
            if not piece:
                break
            response.extend(piece)
            if b"\0" in piece or b"\n" in piece:
                break
    result = response.decode("utf-8", errors="replace").strip("\x00\r\n ")
    if not result:
        raise RuntimeError("ClamAV returned an empty response")
    if result.endswith("FOUND"):
        raise MalwareDetected(result)
    if not result.endswith("OK"):
        raise RuntimeError(f"ClamAV scan failed: {result}")
