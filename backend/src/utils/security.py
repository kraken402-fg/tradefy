import hashlib
import os

class SecurityUtils:
    @staticmethod
    def hash_password(password: str) -> str:
        # Hash a password for storing
        salt = os.urandom(32)  # A new salt for this user
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return salt + pwdhash

    @staticmethod
    def verify_password(stored_password: bytes, provided_password: str) -> bool:
        # Verify a stored password against one provided by user
        salt = stored_password[:32]  # 32 is the length of the salt
        stored_pwdhash = stored_password[32:]
        pwdhash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        return pwdhash == stored_pwdhash
