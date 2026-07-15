from backend.crypto.key_manager import (
    derive_user_key,
    generate_session_key,
    rsa_unwrap_key,
    rsa_wrap_key,
    unwrap_key,
    wrap_key,
)


def test_generate_session_key_default_size():
    key = generate_session_key()
    assert isinstance(key, bytes)
    assert len(key) == 32


def test_wrap_unwrap_roundtrip():
    session_key = generate_session_key()
    user_key = derive_user_key("secret", "salt-123")

    wrapped = wrap_key(session_key, user_key)
    restored = unwrap_key(wrapped, user_key)

    assert restored == session_key


def test_wrap_differs_for_different_session_keys():
    user_key = derive_user_key("secret", "salt-123")

    wrapped_1 = wrap_key(generate_session_key(), user_key)
    wrapped_2 = wrap_key(generate_session_key(), user_key)

    assert wrapped_1 != wrapped_2


def test_rsa_wrap_unwrap_roundtrip():
    session_key = generate_session_key()

    wrapped = rsa_wrap_key(session_key)
    restored = rsa_unwrap_key(wrapped)

    assert restored == session_key
