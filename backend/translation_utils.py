"""
translation_utils.py — Simple translation helpers using googletrans.
Falls back gracefully if translation is unavailable.
"""

try:
    from googletrans import Translator
    _translator = Translator()
except Exception:
    _translator = None


def translate_to_english(text: str) -> str:
    """Translate text to English. Returns original text on failure."""
    if not _translator or not text:
        return text
    try:
        result = _translator.translate(text, dest="en")
        return result.text if result and result.text else text
    except Exception:
        return text


def translate_from_english(text: str, dest_lang: str = "en") -> str:
    """Translate English text to dest_lang. Returns original text on failure."""
    if not _translator or not text or dest_lang == "en":
        return text
    try:
        result = _translator.translate(text, dest=dest_lang)
        return result.text if result and result.text else text
    except Exception:
        return text
