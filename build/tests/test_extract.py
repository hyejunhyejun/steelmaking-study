import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from extract import build_workbook

XLSX = os.path.join(os.path.dirname(__file__), "..", "..", "원본자료", "제선기능장.xlsx")


def test_build_produces_rounds_and_questions():
    data = build_workbook(XLSX)
    ids = [r["id"] for r in data["rounds"]]
    for rid in ["21-1", "25-2"]:
        assert rid in ids
    assert any(r["type"] == "wrong" for r in data["rounds"])
    r21 = next(r for r in data["rounds"] if r["id"] == "21-1")
    assert len(r21["questions"]) >= 5
    q1 = r21["questions"][0]
    assert q1["num"] == 1
    assert q1["parts"][0]["keywords"]  # 키워드 자동 도출됨
    assert "stars" in q1 and "groupId" in q1


def test_wrong_sheet_does_not_inflate_stars():
    """오답노트는 별표 계산에서 제외 → 오답노트에만 있다고 별이 늘지 않음."""
    data = build_workbook(XLSX)
    for r in data["rounds"]:
        for q in r["questions"]:
            assert q["stars"] >= 1
