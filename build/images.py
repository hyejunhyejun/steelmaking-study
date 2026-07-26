import os, io
import openpyxl
from PIL import Image
# 문제 번호 판정은 워드 파서와 반드시 같은 규칙을 써야 한다.
# (회차, 번호) 조인이 어긋나면 그림이 엉뚱한 문제에 붙는다.
from parse_docx import MAIN_RE, SUB_RE

MAX_IMG_WIDTH = 1000
ROUND_SHEETS = ["21-1", "21-2", "22-1", "22-2", "23-1", "23-2",
                "24-1", "24-2", "25-1", "25-2"]

# 엑셀에 회전된 채 삽입된 그림을 바로 세우는 맵(전수 육안 확인 완료). 값=반시계 각도.
ROTATE = {
    "21-1_1": 90, "21-2_1": 90, "22-1_1": 90, "23-1_0": 90,
    "24-1_1": 90, "24-2_0": 90, "25-1_2": 90, "25-2_0": 90,  # 부두아(8장 동일)
    "21-1_3": 90, "24-2_1": 90,                               # 슬래그 삼원계
    "21-1_4": 90,                                             # 소결 공정도
    "21-2_0": -90,                                            # 풍구 단면
    "24-2_3": 90, "25-2_1": 90, "25-2_2": 90,                 # 폰캡처 내부 눕힘
}
# 휴대폰 촬영 앱 화면째로 캡처된 이미지 — 상단/하단 UI 바 제거(iOS 고정 위치)
CROP_PHONE_UI = {"22-1_0", "24-1_0", "24-2_2", "24-2_3", "25-2_1", "25-2_2"}
CROP_TOP, CROP_BOTTOM = 130, 115


def _question_rows(ws):
    """(행번호, 대문제번호) 목록."""
    out = []
    for r in range(1, ws.max_row + 1):
        c = ws.cell(r, 3).value
        cs = c.strip() if isinstance(c, str) else None
        if cs and MAIN_RE.match(cs) and not SUB_RE.match(cs):
            out.append((r, int(MAIN_RE.match(cs).group(1))))
    return out


def _save(raw_bytes, path, rotate=0, crop_ui=False):
    """폰 UI 크롭 → 회전 → 축소 → JPEG 저장."""
    try:
        im = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        if crop_ui:
            w, h = im.size
            im = im.crop((0, CROP_TOP, w, h - CROP_BOTTOM))
        if rotate:
            im = im.rotate(rotate, expand=True)
        if im.width > MAX_IMG_WIDTH:
            h2 = round(im.height * MAX_IMG_WIDTH / im.width)
            im = im.resize((MAX_IMG_WIDTH, h2), Image.LANCZOS)
        im.save(path, "JPEG", quality=82, optimize=True)
    except Exception:
        with open(os.path.splitext(path)[0] + ".png", "wb") as f:
            f.write(raw_bytes)


def extract_images(xlsx_path, out_dir):
    """엑셀 그림을 저장하고 {(회차id, 대문제번호): [경로,...]} 반환."""
    os.makedirs(out_dir, exist_ok=True)
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    mapping = {}
    for sheet in ROUND_SHEETS:
        ws = wb[sheet]
        rows = _question_rows(ws)
        for i, img in enumerate(getattr(ws, "_images", [])):
            try:
                anchor = img.anchor._from.row + 1
            except Exception:
                continue
            owner = None
            for r, num in rows:
                if r <= anchor:
                    owner = num
            if owner is None:
                continue
            key = f"{sheet}_{i}"
            _save(img._data(), os.path.join(out_dir, key + ".jpg"),
                  ROTATE.get(key, 0), key in CROP_PHONE_UI)
            mapping.setdefault((sheet, owner), []).append(f"images/{key}.jpg")
    return mapping
