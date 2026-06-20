# Japanese TV Study Project

## Final Architecture v1.0

---

# 1. 프로젝트 목표

스마트TV를 중심으로 사용하는 일본어 학습 시스템을 구축한다.

목표는 복잡한 기능이 많은 앱이 아니라,

> 한 문장씩 회상하고 소리 내어 말하는 TV용 전자 플래시카드 시스템

이다.

---

# 2. 핵심 학습 방식

한국어 표시

↓

사용자가 일본어를 떠올림

↓

정답 확인

↓

일본어 읽기

↓

쉐도잉

↓

다음 문제

핵심은 능동 회상(Active Recall)이다.

---

# 3. 데이터 종류

## Expression

통째로 외우는 표현

예)

おはようございます。

そうなんだ。

大丈夫ですか。

---

## Pattern

응용 가능한 문형

예)

～たいです

～てください

～ません

---

# 4. 문형 시스템

문형은 유지한다.

예문만 차수별로 바꾼다.

예)

～たいです

1차

日本へ行きたいです。

2차

映画を見たいです。

3차

北海道へ行きたいです。

---

# 5. 개발 원칙

설계는 최종 버전까지 고려한다.

구현은 단계적으로 진행한다.

새로운 기능보다 오래 사용하는 것을 우선한다.

대화를 저장하지 않는다.

대화의 결론을 저장한다.

---

# 6. UI 원칙

한 화면 = 한 카드

스크롤 금지

큰 글씨 사용

버튼 최소화

TV 리모컨 조작 중심

---

# 7. 기술 스택

HTML

CSS

JavaScript

GitHub Pages

Google Sheets

---

# 8. 최종 구조

Google Sheets

↓

CSV 공유

↓

GitHub Pages

↓

웹앱

↓

PC

스마트폰

스마트TV

---

# 9. GitHub 구조

Japanese TV Study Project

index.html

style.css

script.js

README.md

DECISIONS.md

---

# 10. 데이터 구조

id

type

pattern

cycle

jp

kr

audio

level

lastReview

---

# 11. 실제 데이터 저장 위치

Google Sheets

예)

id | type | pattern | cycle | jp | kr

1 | expression | | 0 | おはようございます。 | 안녕하세요.

2 | pattern | ～たいです | 1 | 日本へ行きたいです。 | 일본에 가고 싶습니다.

3 | pattern | ～たいです | 2 | 映画を見たいです。 | 영화를 보고 싶습니다.

---

# 12. 프로그램이 데이터를 읽는 방식

Google Sheets

↓

CSV 공유

↓

fetch()

↓

script.js

↓

문제 출제

GitHub에는 데이터 파일을 저장하지 않는다.

Google Sheets가 진짜 데이터베이스이다.

---

# 13. V1 기능

랜덤 출제

한국어 표시

정답 보기

일본어 표시

다음 문제

큰 글씨

TV 친화적 UI

---

# 14. V1에서 제외

Expression / Pattern 분리

문형 모드

Cycle

Level

SRS

mp3

통계

음성 인식

---

# 15. 개발 순서

V1

기본 플래시카드

↓

V2

Expression / Pattern 분리

↓

V3

문형 시스템

↓

V4

숙련도

↓

V5

간단한 SRS

↓

V6

mp3 음성

↓

V7

문형별 학습 모드

---

# 16. 음성 정책

Web Speech API에 의존하지 않는다.

필요하면 문장별 mp3 파일을 사용한다.

---

# 17. 우선순위

높음

능동 회상

문형

차수

쉐도잉

반복

낮음

AI 채팅

랭킹

경험치

애니메이션

화려한 기능

---

# 핵심 원칙

설계는 크게.

구현은 작게.

발전은 천천히.

단순함이 성능이다.

문장을 많이 아는 것보다 문형을 체득하는 것이 중요하다.

TV에서는 복잡함보다 단순함이 더 강력하다.

새로운 기능을 만드는 것보다 이미 있는 기능을 오래 사용하는 것이 중요하다.

