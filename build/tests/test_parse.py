import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from parse import parse_rows


def test_main_with_subquestions():
    rows = [
        ("○ 2021-1회", None, None),
        (None, "1. 선철을 파면의 색깔, 열원, 용도에 따라 각각 분류하시오.", None),
        (None, "1-1. 파면의 색깔", None),
        (None, None, "회선철, 백선철, 반선철"),
        (None, "1-2. 열원", None),
        (None, None, "목탄 선철, 코크스 선철, 전기 선철"),
    ]
    qs = parse_rows(rows)
    assert len(qs) == 1
    q = qs[0]
    assert q["num"] == 1
    assert q["source"] == "2021-1회"
    assert q["text"].startswith("선철을 파면의 색깔")
    assert [p["label"] for p in q["parts"]] == ["파면의 색깔", "열원"]
    assert q["parts"][0]["answers"] == ["회선철, 백선철, 반선철"]


def test_main_with_direct_answers():
    rows = [
        (1, "5. 행잉의 원인 5가지", None),
        (None, None, "장입물 분포 불량"),
        (None, None, "코크스 품질 불량"),
    ]
    qs = parse_rows(rows)
    assert len(qs) == 1
    assert qs[0]["num"] == 5
    assert qs[0]["parts"] == [
        {"label": "", "answers": ["장입물 분포 불량", "코크스 품질 불량"]}
    ]


def test_source_changes_on_new_header():
    rows = [
        ("○ 21-1", None, None),
        (None, "5. 행잉의 원인 5가지", None),
        (None, None, "통기 불량"),
        ("○ 21-2", None, None),
        (None, "17. 고압조업 장치 2가지", None),
        (None, None, "노정압력 제어장치"),
    ]
    qs = parse_rows(rows)
    assert [q["source"] for q in qs] == ["21-1", "21-2"]
