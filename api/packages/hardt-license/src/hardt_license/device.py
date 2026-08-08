import hashlib
import platform
import socket
import uuid


def get_operating_system() -> str:
    system = platform.system()
    release = platform.release()

    return f"{system} {release}".strip()


def get_device_name() -> str:
    return socket.gethostname()


def get_device_fingerprint() -> str:
    raw_fingerprint = "|".join(
        [
            platform.system(),
            platform.release(),
            platform.machine(),
            platform.processor(),
            socket.gethostname(),
            str(uuid.getnode()),
        ]
    )

    return hashlib.sha256(
        raw_fingerprint.encode("utf-8")
    ).hexdigest()


def get_device_id() -> str:
    fingerprint = get_device_fingerprint()

    return f"HARDT-{fingerprint[:24].upper()}"
