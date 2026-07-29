# 제선기능장 실기 학습 사이트

제선기능장 필답형 기출을 타이핑하며 공부하는 정적 웹앱.
순수 HTML/CSS/JS(외부 라이브러리 없음), 진행상황·오답노트는 브라우저에 저장.

## 학습 항목

| 항목 | 내용 | 모드 |
|---|---|---|
| 회차별 | 2021년 1회차 ~ 2025년 2회차 (10회차 · 200문제) | 연습·테스트·시험 |
| 이외 기출문제 | 유형별 정리 (62유형 · 173문제, 기출 출제분은 배지 표시) | 연습·테스트 |
| 랜덤 20문제 | 회차 + 유형 고유문제 286개 풀에서 무작위 20문제 | 테스트·시험 |
| 오답노트 | X 표시한 문제가 자동 누적, 초기화 버튼 제공 | 연습·테스트 |

- **연습**: 문제와 모범답안을 함께 보며 암기
- **테스트**: 답 입력 → 핵심어 자동 대조 → 모범답안 확인 → O/X 자가채점
- **시험**: 전 문항 풀고 일괄 채점(키워드 점수) + 문제별 O/X

## 암기법

자주 나오는 나열형 문제의 두문자 모음: [암기법.md](암기법.md)
(예: 철광석 구비조건 → **유상철피맥**)

## 로컬 실행

`python -m http.server 8000` 실행 후 http://localhost:8000/ 접속.
(ES 모듈·fetch를 쓰므로 `index.html` 직접 열기는 지원하지 않음.)

## 원본 자료 (`원본자료/`, git 제외)

- `제선기능장_기출문제_회차별.docx` — 회차별 문제·정답 교정판 (문제 데이터의 정본)
- `제선기능장_문제집_사진정리본.docx` — 유형별 정리본 (이외 기출문제)
- `제선기능장.xlsx` — **그림 소스 전용**(회차·문제번호로 그림을 연결)

## 데이터 재생성 / 테스트

```
python build/build_v2.py      # 워드 2종 + 엑셀 그림 → data/questions.json
python -m pytest build/tests  # 빌드 로직 테스트
node --test                   # 사이트 로직 테스트
```

빌드 구성: `parse_docx.py`(워드 파싱) · `images.py`(엑셀 그림 추출·회전·크롭) ·
`imagemap.py`(유형 문제 ↔ 그림 매핑) · `derive.py`(핵심어 도출) · `build_v2.py`(조립).

## 배포 (GitHub Pages)

저장소: https://github.com/hyejunhyejun/steelmaking-study (Public)

```
git push origin main
```

Settings → Pages → Source: `main` / `root` → 저장.
공개 주소: https://hyejunhyejun.github.io/steelmaking-study/

## 그림 채우기

사진정리본 문제 중 엑셀에 없는 그림 8건은 `그림 준비중` 박스로 표시된다.
그림을 준비하면 `data/images/`에 넣고 `build/imagemap.py`의 `TOPIC_IMAGES`에
`"qid": ["images/파일명.jpg"]` 형태로 등록한 뒤 재빌드한다.
