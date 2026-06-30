// ====================
// 전역 변수[cite: 2]
// ====================
let allMasterData = []; 
let filteredQuizData = []; // 현재 필터링된 퀴즈 배열[cite: 2]
let currentIndex = 0;      // 순차 출제를 위한 인덱스 카운터
let currentQuiz = null;    //[cite: 2]

// ====================
// DOM 요소[cite: 2]
// ====================
const quizPage = document.getElementById("quizPage"); //[cite: 2]
const weekFilter = document.getElementById("weekFilter");
const quizBadge = document.getElementById("quizBadge"); //[cite: 2]
const questionEl = document.getElementById("question"); //[cite: 2]
const answerEl = document.getElementById("answer"); //[cite: 2]
const jpTextEl = document.getElementById("jpText"); //[cite: 2]
const metaTextEl = document.getElementById("metaText"); //[cite: 2]
const showAnswerBtn = document.getElementById("showAnswerBtn"); //[cite: 2]
const nextQuestionBtn = document.getElementById("nextQuestionBtn");

// ====================
// TTS (음성 합성)[cite: 2]
// ====================
function speak(text, lang = 'ja-JP') { //[cite: 2]
    if ('speechSynthesis' in window) { //[cite: 2]
        window.speechSynthesis.cancel();  //[cite: 2]
        const utterance = new SpeechSynthesisUtterance(text); //[cite: 2]
        utterance.lang = lang; //[cite: 2]
        const voices = window.speechSynthesis.getVoices(); //[cite: 2]
        const jpVoice = voices.find(v => v.lang.includes('ja-JP') || v.lang.includes('ja_JP')); //[cite: 2]
        if (jpVoice) utterance.voice = jpVoice; //[cite: 2]
        window.speechSynthesis.speak(utterance); //[cite: 2]
    }
}

// ====================
// CSV 파싱 규칙 (구글 시트 쉼표 우회 처리)
// ====================
function parseCSVLine(line) {
    let result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const c = line[i];

        if (c === '"') {
            inQuotes = !inQuotes;
        } else if (c === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += c;
        }
    }

    result.push(current);

    return result.map(v => v.trim());
}

// ====================
// CSV 데이터 로드[cite: 2]
// ====================
// ====================
// CSV 데이터 로드
// ====================
async function loadCSV(){ 
    try {
        const csvURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTUWrzsscnZ3sHRvSenqLY4o1c-mkvZLYV9GDTdhjvwkyBI7AYjkIRGFKX3Qjdftb7NL5m6HGnAYwS/pub?gid=619535186&single=true&output=csv"; 
        
        const res = await fetch(csvURL); 
        const text = await res.text(); 
        
        // [수정됨] 구글 시트 데이터 추출 시 섞여 들어오는 BOM(보이지 않는 특수문자) 완벽 제거
        const cleanText = text.replace(/^\uFEFF/, '');
        
        const rows = cleanText.split(/\r?\n/).filter(line => line.trim() !== "");
        
        // [수정됨] 헤더 및 데이터의 양옆 공백(스페이스바)을 제거(.trim())하여 인식 오류 방지
        const headers = parseCSVLine(rows[0]).map(v =>
            v.replace(/^\uFEFF/, "").toLowerCase().trim()
        );
        
        allMasterData = rows.slice(1).map((line, index) => { 
            const cols = parseCSVLine(line);
            let obj = {}; 
            
            headers.forEach((header, i) => {
                obj[header] = (cols[i] || "").trim();
            });
            
            if (!obj.id) obj.id = index + 1; 
            return obj;
        }).filter(item => item.jp && item.kr); // 양쪽 열에 데이터가 있는 경우만 저장
        console.log("데이터:", allMasterData);
        
        populateWeekFilter();
        startQuiz(); 
    } catch (e) {
        console.error("데이터 로드 실패:", e); 
        questionEl.innerText = "데이터를 불러오는 데 실패했습니다.";
    }
}

// ====================
// 주차(Week) 필터 생성
// ====================
function populateWeekFilter() {
    weekFilter.innerHTML = '<option value="전체">전체 주차</option>';
    
    // 데이터 내 week 열의 중복 없는 유일값 추출
    const uniqueWeeks = [...new Set(allMasterData.map(item => item.week).filter(Boolean))];
    
    // 정렬 후 옵션 추가
    uniqueWeeks.sort((a, b) => String(a).localeCompare(String(b), undefined, {numeric: true})).forEach(w => {
        const option = document.createElement("option");
        option.value = w;
        option.innerText = String(w).includes("주차") ? w : `${w}주차`;
        weekFilter.appendChild(option);
    });
}

// ====================
// 퀴즈 섞기 및 준비 (피셔-예이츠 셔플 알고리즘)
// ====================
function startQuiz() {
    const selectedWeek = weekFilter.value;
    
    // 선택된 주차 데이터만 필터링
    filteredQuizData = allMasterData.filter(item => {

    if (selectedWeek === "전체") return true;

    return String(item.week).trim() === String(selectedWeek).trim();

    });

    if (filteredQuizData.length === 0) {
        quizBadge.innerText = "경고";
        questionEl.innerText = "선택하신 주차에 해당하는 문제가 없습니다.";
        showAnswerBtn.style.display = "none";
        return;
    }

    // [핵심 조건] 한꺼번에 무작위로 섞기
    for (let i = filteredQuizData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredQuizData[i], filteredQuizData[j]] = [filteredQuizData[j], filteredQuizData[i]];
    }

    currentIndex = 0; // 카운터 초기화
    nextQuiz();
}

// 주차 셀렉트 박스 변경 시 감지
function changeWeekFilter() {
    startQuiz();
}

// ====================
// 문제 출제 (중복 없이 순차적 진행)[cite: 2]
// ====================
function nextQuiz() {
    // 모든 문제를 다 돌았을 경우 다시 셔플하여 순환시킴
    if (currentIndex >= filteredQuizData.length) {
        alert("선택한 범위의 모든 문제를 완료했습니다! 새로운 순서로 다시 섞습니다.");
        startQuiz();
        return;
    }

    // 순차적으로 문제 배정
    currentQuiz = filteredQuizData[currentIndex];
    
    // UI 업데이트
    const weekLabel = currentQuiz.week ? (String(currentQuiz.week).includes("주차") ? currentQuiz.week : `${currentQuiz.week}주차`) : "일반";
    quizBadge.innerText = `[${weekLabel}] ${currentQuiz.type || ''} ${currentQuiz.category || ''}`.trim(); //[cite: 2]
    questionEl.innerText = currentQuiz.kr; //[cite: 2]
    
    // 초기 노출 상태 세팅[cite: 2]
    answerEl.classList.remove("reveal"); //[cite: 2]
    showAnswerBtn.style.display = "block";
    nextQuestionBtn.style.display = "none";
}

// ====================
// 정답 보기[cite: 2]
// ====================
function showAnswer() { //[cite: 2]
    jpTextEl.innerText = currentQuiz.jp; //[cite: 2]
    metaTextEl.innerText = currentQuiz.meta ? `💡 Tip: ${currentQuiz.meta}` : ""; //[cite: 2]
    
    answerEl.classList.add("reveal"); //[cite: 2]
    showAnswerBtn.style.display = "none";
    nextQuestionBtn.style.display = "block";
    
    speak(currentQuiz.jp); // 음성 재생[cite: 2]
    
    // 다음 문제 준비를 위해 인덱스 1 증가
    currentIndex++;
}

// 앱 실행 시 자동 로드
loadCSV();

const homeBtn = document.getElementById("homeBtn");

if (homeBtn) {

    homeBtn.addEventListener("click", () => {

        location.href =
        "https://tajunii.github.io/study-home/";

    });

}