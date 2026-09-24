from __future__ import annotations

import socket

import pytest

from grounded_worker.security import UnsafeSourceUrl, validate_public_http_url


def _addr(ip: str):
    family = socket.AF_INET6 if ":" in ip else socket.AF_INET
    return [(family, socket.SOCK_STREAM, 6, "", (ip, 0, 0, 0) if family == socket.AF_INET6 else (ip, 0))]


def test_blocks_localhost_without_dns(monkeypatch: pytest.MonkeyPatch):
    called = False

    def resolver(*_args, **_kwargs):
        nonlocal called
        called = True
        return _addr("127.0.0.1")

    monkeypatch.setattr(socket, "getaddrinfo", resolver)
    with pytest.raises(UnsafeSourceUrl):
        validate_public_http_url("http://localhost/internal")
    assert called is False


@pytest.mark.parametrize("ip", ["127.0.0.1", "10.0.0.5", "169.254.169.254", "::1", "fc00::1"])
def test_blocks_non_public_dns_targets(monkeypatch: pytest.MonkeyPatch, ip: str):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *_args, **_kwargs: _addr(ip))
    with pytest.raises(UnsafeSourceUrl):
        validate_public_http_url("https://example.test/resource.pdf")


def test_allows_global_dns_target(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *_args, **_kwargs: _addr("93.184.216.34"))
    assert validate_public_http_url("https://example.test/resource.pdf") == "https://example.test/resource.pdf"


def test_blocks_credentials_and_nonstandard_ports(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *_args, **_kwargs: _addr("93.184.216.34"))
    with pytest.raises(UnsafeSourceUrl):
        validate_public_http_url("https://user:password@example.test/file")
    with pytest.raises(UnsafeSourceUrl):
        validate_public_http_url("https://example.test:8443/file")
