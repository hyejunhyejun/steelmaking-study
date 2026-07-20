# 제선기능장 실기 학습 사이트

제선기능장 실기 기출을 회차별로 타이핑하며 공부하는 정적 웹앱.
연습·테스트·시험·오답노트 4가지 모드. 순수 HTML/CSS/JS(외부 라이브러리 없음).

## 로컬 실행
`python -m http.server 8000` 실행 후 http://localhost:8000/ 접속.
(그냥 `index.html`을 더블클릭하면 안 됨 — 정적 서버가 필요.)

## 데이터 재생성 / 테스트
- 엑셀 → 데이터: `python build/extract.py` (원본자료/제선기능장.xlsx 필요)
- 파이썬 테스트: `python -m pytest build/tests`
- JS 테스트: `node --test`

## 배포 (GitHub Pages)
1. GitHub에서 새 **공개** 저장소 생성(예: `jeseon-study`).
2. 이 폴더에서 원격 연결 후 push:
   ```
   git remote add origin https://github.com/<사용자>/jeseon-study.git
   git branch -M main
   git push -u origin main
   ```
3. 저장소 **Settings → Pages → Source: `main` / `root`** 저장.
4. 수 분 후 `https://<사용자>.github.io/jeseon-study/` 접속.
