"""mnemonics.py → 암기법.md(GitHub용) + data/mnemonics.json(사이트용).

한 원본에서 두 결과물을 만들어 내용이 어긋나지 않게 한다.
"""
import os, sys, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mnemonics import M, PAIRS, NUMBERS


def _rounds_text(rounds):
    if not rounds:
        return "기출 없음 · 보충"
    return "기출 " + " · ".join(rounds)


def to_json():
    return {
        "sections": [
            {"name": s, "entries": [
                {k: e[k] for k in ("title", "emoji", "phrase", "read", "items",
                                   "rounds", "reordered")} | {"origin": e.get("origin", False)}
                for e in M if e["section"] == s
            ]}
            for s in dict.fromkeys(e["section"] for e in M)
        ],
        "pairs": [{"topic": a, "left": b, "right": c} for a, b, c in PAIRS],
        "numbers": [{"name": a, "value": b} for a, b in NUMBERS],
    }


def to_markdown():
    out = ["# 제선기능장 실기 — 두문자 암기법", "",
           "**말이 되게 만든** 두문자 모음입니다. 억지로 글자만 붙이면 그것도 외울 거리가 되니까,",
           "순서를 바꿔서 **한 문장으로 읽히게** 만들었습니다.", "",
           "- 🔀 = 외우기 좋게 **순서를 바꾼 것** (`○가지 쓰시오` 문제는 순서가 채점에 영향 없음)",
           "- `(원본)` = 원본 정리노트에 이미 있던 두문자",
           "- **기출 표시** = 그 문제가 실제로 출제된 회차", ""]
    for section in dict.fromkeys(e["section"] for e in M):
        out += ["---", "", f"## {section}", ""]
        for e in (x for x in M if x["section"] == section):
            flags = []
            if e["reordered"]:
                flags.append("🔀")
            if e.get("origin"):
                flags.append("`(원본)`")
            out.append(f"### {e['title']} {' '.join(flags)}".rstrip())
            out.append(f"**{_rounds_text(e['rounds'])}**")
            out.append("")
            out.append(f"# {e['emoji']} {e['phrase']}".replace("#  ", "# "))
            if e["read"]:
                out.append(f"> {e['read']}")
            out.append("")
            out.append("| | |")
            out.append("|---|---|")
            for k, v in e["items"]:
                out.append(f"| **{k}** | {v} |")
            out.append("")
    out += ["---", "", "## 헷갈리는 짝 — 반대로 외우기", "",
            "| 구분 | 한쪽 | 반대쪽 |", "|---|---|---|"]
    for a, b, c in PAIRS:
        out.append(f"| **{a}** | {b} | {c} |")
    out += ["", "---", "", "## 숫자로 외우는 것", "", "| 항목 | 값 |", "|---|---|"]
    for a, b in NUMBERS:
        out.append(f"| {a} | **{b}** |")
    out += ["", "> 석영 상변태는 **\"오칠삼 · 팔칠공 · 천사칠공 · 천칠일삼\"** 리듬으로 읽으면 외워집니다.", ""]
    return "\n".join(out)


def main():
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    with open(os.path.join(base, "data", "mnemonics.json"), "w", encoding="utf-8") as f:
        json.dump(to_json(), f, ensure_ascii=False, indent=2)
    with open(os.path.join(base, "암기법.md"), "w", encoding="utf-8") as f:
        f.write(to_markdown())
    print(f"암기법 {len(M)}개 → data/mnemonics.json, 암기법.md")


if __name__ == "__main__":
    main()
