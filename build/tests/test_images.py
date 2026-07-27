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


def test_phone_ui_cropped_and_trimmed():
    """폰 캡처는 UI 바 제거 후 잉크 영역까지 트림되어 여백이 남지 않는다."""
    from PIL import Image
    extract_images(XLSX, OUT)
    im = Image.open(os.path.join(OUT, "22-1_0.jpg"))
    # UI 제거만 하면 715px, 잉크 트림까지 하면 그보다 훨씬 짧다
    assert im.height < 500
    assert im.width <= 1000


def test_small_scan_is_upscaled_for_readability():
    """원본이 작은 스캔(357x180)은 읽기 좋은 크기로 확대된다."""
    from PIL import Image
    extract_images(XLSX, OUT)
    im = Image.open(os.path.join(OUT, "21-1_2.jpg"))
    assert im.width >= 460 or im.height >= 260


def test_sideways_phone_captures_are_rotated_upright():
    """열풍로 배관도·노정장입물 4패널은 눕게 촬영되어 회전 보정이 필요하다."""
    from PIL import Image
    extract_images(XLSX, OUT)
    for name in ("24-1_0.jpg", "24-2_2.jpg"):
        im = Image.open(os.path.join(OUT, name))
        assert im.width > im.height, name


def test_trimmed_image_has_ink_near_edges():
    """트림이 제대로 되면 이미지 테두리 근처에 잉크(어두운 픽셀)가 존재한다."""
    from PIL import Image
    import numpy as np
    extract_images(XLSX, OUT)
    g = np.asarray(Image.open(os.path.join(OUT, "22-1_0.jpg")).convert("L"))
    band = 24  # 테두리에서 24px 이내
    edges = np.concatenate([g[:band].ravel(), g[-band:].ravel(),
                            g[:, :band].ravel(), g[:, -band:].ravel()])
    assert (edges < 170).sum() > 0
