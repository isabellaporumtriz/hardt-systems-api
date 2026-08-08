import keyring


SERVICE_NAME = "hardt-systems-license"


class TokenStorage:
    def __init__(self, product_slug: str):
        self.product_slug = product_slug

    def save(self, activation_token: str) -> None:
        keyring.set_password(
            SERVICE_NAME,
            self.product_slug,
            activation_token,
        )

    def load(self) -> str | None:
        return keyring.get_password(
            SERVICE_NAME,
            self.product_slug,
        )

    def delete(self) -> None:
        try:
            keyring.delete_password(
                SERVICE_NAME,
                self.product_slug,
            )
        except keyring.errors.PasswordDeleteError:
            pass
