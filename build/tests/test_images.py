import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from images import extract_images

XLSX = os.path.join(os.path.dirname(__file__), "..", "..", "원본자료", "제선기능장.xlsx")
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "data", "images")


def test_extract_maps_round_and_question():
    m = extract_images(XLSX, OUT)
    # 21-1 4번(고로 구조)에 그림이 붙는다
    assert m[("21-1", 4)] == ["images/21-1_0.jpg"]
    # 22-1 12번(고로 구조 명칭)에도 그림이 있다
    assert ("22-1", 12) in m
    # 회차 시트의 앵커 25개가 매핑된다(틀린문제 시트는 제외)
    assert sum(len(v) for v in m.values()) == 25


def test_rotated_image_is_landscape():
    """부두아 곡선은 회전 적용되어 가로가 세로보다 길다."""
    from PIL import Image
    extract_images(XLSX, OUT)
    im = Image.open(os.path.join(OUT, "21-1_1.jpg"))
    assert im.width > im.height


def test_phone_ui_cropped():
    """폰 캡처 이미지는 상·하단 UI 바가 잘려 원본(960px)보다 짧다."""
    from PIL import Image
    extract_images(XLSX, OUT)
    im = Image.open(os.path.join(OUT, "22-1_0.jpg"))
    assert im.height == 960 - 130 - 115
