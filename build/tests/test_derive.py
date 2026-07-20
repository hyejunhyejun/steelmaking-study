import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from derive import derive_keywords, normalize, compute_groups


def test_derive_keywords_splits_commas():
    assert derive_keywords(["회선철, 백선철, 반선철"]) == ["회선철", "백선철", "반선철"]


def test_derive_keywords_multi_answers_and_enumerators():
    assert derive_keywords(["① 장입물 분포 불량", "코크스 품질 불량"]) == [
        "장입물 분포 불량", "코크스 품질 불량"]


def test_normalize_strips_number_and_symbols():
    a = normalize("1. 선철을 파면의 색깔, 열원, 용도에 따라 각각 분류하시오.")
    b = normalize("선철을 파면의 색깔 열원 용도에 따라 각각 분류하시오")
    assert a == b


def test_compute_groups_counts_distinct_rounds():
    items = [
        ("21-1", "1. 선철 분류하시오"),
        ("23-2", "선철 분류하시오."),
        ("21-1", "2. 다른 문제"),
    ]
    out = compute_groups(items)
    assert out[0]["stars"] == 2
    assert out[1]["stars"] == 2
    assert out[0]["groupId"] == out[1]["groupId"]
    assert out[2]["stars"] == 1
    assert out[2]["groupId"] != out[0]["groupId"]
