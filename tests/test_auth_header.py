from main import app
from shop_api import _user


def test_bearer_prefix_without_token_is_treated_as_unauthenticated():
    assert _user("Bearer ", db=None) is None
