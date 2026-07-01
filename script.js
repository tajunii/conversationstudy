// ====================
// 전역 변수 선언 (오류 방지를 위해 상단 배치)
// ====================
let allMasterData = []; 
let filteredQuizData = []; 
let userScores = {};       

let currentRoundPool = []; 
let currentIndex = 0;      
let isReviewPhase = false; // 💡 에러 원인 해결: 전역 변수 확실히 선언
let currentQuiz = null;    // 💡 에러 원인 해결: 전역 변수 확실히 선언

// ====================
// DOM 요소 연결
// ====================
const categoryFilter = document.getElementById("categoryFilter");
const cycleFilter = document.getElementById("cycleFilter");
const questionEl = document.getElementById("question"); 
const answerEl = document.getElementById("answer"); 
const jpTextEl = document.getElementById("jpText"); 
const metaTextEl = document.getElementById("metaText"); 
const showAnswerBtn = document.getElementById("showAnswerBtn"); 
const evaluationButtons = document.getElementById("evaluationButtons");
const progressText = document.getElementById("progressText");

// ====================
// 배열 무작위 셔플 함수
// ====================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ====================
// 스코어 로컬 스토리지 관리
// ====================
function loadScores() {
    const saved = localStorage.getItem("quizScoresData");
    userScores = saved ? JSON.parse(saved) : {};
}

function saveScores() {
    localStorage.setItem("quizScoresData", JSON.stringify(userScores));
}

function getScore(id) {
    return userScores[id] !== undefined ? userScores[id] : null; 
}

function resetScores() {
    if(confirm("모든 학습 기록(점수)을 초기화하시겠습니까?")) {
        userScores = {};
        saveScores();
        alert("초기화 되었습니다!");
        applyFiltersAndStart();
    }
}

// ====================
// 오디오 재생
// ====================
let currentAudio = null; 
function playAudio() {
    if (!currentQuiz || !currentQuiz.audio) return;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    const audioUrl = `https://raw.githubusercontent.com/tajunii/conversationstudy/main/audio/${currentQuiz.audio}`;
    currentAudio = new Audio(audioUrl);
    currentAudio.play().catch(e => console.error("음성 재생 실패:", e));
}

// ====================
// CSV 파싱 및 로드
// ====================
function parseCSVLine(line) {
    let result = [], current = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === "," && !inQuotes) { result.push(current); current = ""; } 
        else { current += c; }
    }
    result.push(current);
    return result.map(v => v.trim());
}

async function loadCSV(){ 
    try {
        const csvURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTUWrzsscnZ3sHRvSenqLY4o1c-mkvZLYV9GDTdhjvwkyBI7AYjkIRGFKX3Qjdftb7NL5m6HGnAYwS/pub?gid=619535186&single=true&output=csv"; 
        const res = await fetch(csvURL); 
        const text = await res.text(); 
        const cleanText = text.replace(/^\uFEFF/, '');
        const rows = cleanText.split(/\r?\n/).filter(line => line.trim() !== "");
        const headers = parseCSVLine(rows[0]).map(v => v.replace(/^\uFEFF/, "").toLowerCase().trim());
        
        allMasterData = rows.slice(1).map((line, index) => { 
            const cols = parseCSVLine(line);
            let obj = {}; 
            headers.forEach((header, i) => { obj[header] = (cols[i] || "").trim(); });
            if (!obj.id) obj.id = String(index + 1); 
            return obj;
        }).filter(item => item.jp && item.kr);
        
        loadScores();
        populateFilters();
        applyFiltersAndStart(); 
    } catch (e) {
        questionEl.innerText = "데이터 로드 실패";
    }
}

function populateFilters() {
    const uniqueCats = [...new Set(allMasterData.map(item => item.category).filter(Boolean))];
    uniqueCats.forEach(c => {
        const opt = document.createElement("option"); opt.value = c; opt.innerText = c;
        categoryFilter.appendChild(opt);
    });
    const uniqueCycles = [...new Set(allMasterData.map(item => item.cycle).filter(Boolean))];
    uniqueCycles.forEach(c => {
        const opt = document.createElement("option"); opt.value = c; opt.innerText = c;
        cycleFilter.appendChild(opt);
    });
}

function changeFilter() { applyFiltersAndStart(); }

// ====================
// 필터 적용 및 퀴즈 첫 시작
// ====================
function applyFiltersAndStart() {
    const selCat = categoryFilter.value;
    const selCycle = cycleFilter.value;
    
    filteredQuizData = allMasterData.filter(item => {
        const matchCat = selCat === "전체" || item.category === selCat;
        const matchCyc = selCycle === "전체" || item.cycle === selCycle;
        return matchCat && matchCyc;
    });

    if (filteredQuizData.length === 0) {
        questionEl.innerText = "해당 조건에 맞는 데이터가 없습니다.";
        showAnswerBtn.style.display = "none";
        evaluationButtons.style.display = "none";
        progressText.innerText = "마스터: 0 / 0";
        return;
    }

    currentRoundPool = shuffleArray([...filteredQuizData]);
    isReviewPhase = false;
    currentIndex = 0;

    nextQuiz();
}

// ====================
// 순차 및 오답 격리 출제 로직
// ====================
function nextQuiz() {
    // 1. 현재 라운드 바구니를 다 비웠을 때 페이즈 전환 판단
    if (currentIndex >= currentRoundPool.length) {
        // 복습이 필요한(점수가 1인) 문제들만 수집
        const wrongItems = filteredQuizData.filter(item => getScore(item.id) === 1);

        if (!isReviewPhase) {
            // [전체 1회독 완료 시점]
            if (wrongItems.length > 0) {
                alert(`📝 1회독 완료!\n'다시 보기'를 선택한 취약 문제(${wrongItems.length}개) 복습을 시작합니다.`);
                currentRoundPool = shuffleArray([...wrongItems]);
                isReviewPhase = true;
                currentIndex = 0;
            } else {
                alert("🎉 모든 문제를 한 번에 맞추셨습니다! 다시 처음부터 1회독을 시작합니다.");
                applyFiltersAndStart();
                return;
            }
        } else {
            // [오답 복습 라운드 완료 시점]
            if (wrongItems.length > 0) {
                alert(`🔄 복습 완료!\n아직 마스터하지 못한 ${wrongItems.length}개의 문제를 다시 훈련합니다.`);
                currentRoundPool = shuffleArray([...wrongItems]);
                currentIndex = 0;
            } else {
                alert("🎯 축하합니다! 모든 문제를 마스터했습니다! 전체 1회독을 다시 시작합니다.");
                applyFiltersAndStart();
                return;
            }
        }
    }

    // 2. UI 및 상단 진행률 업데이트
    updateMasteryRate();

    // 3. 문제 출제 및 검증
    currentQuiz = currentRoundPool[currentIndex];
    
    if (!currentQuiz) {
        questionEl.innerText = "오류가 발생했습니다. 기록을 초기화하거나 필터를 변경해 주세요.";
        return;
    }

    questionEl.innerText = currentQuiz.kr; 
    answerEl.classList.remove("reveal"); 
    showAnswerBtn.style.display = "block";
    evaluationButtons.style.display = "none"; 
}

// 💡 성장형 마스터 스탯 업데이트 함수
function updateMasteryRate() {
    if(filteredQuizData.length === 0) return;
    
    // 이진 구조 마스터 카운트: 스토리지에 기록이 있고, 그 값이 0(바로 맞춤)인 문제 개수
    const masterCount = filteredQuizData.filter(item => userScores[item.id] === 0).length;

    const modeBadge = isReviewPhase 
        ? `오답 복습 중 [${currentIndex + 1}/${currentRoundPool.length}]` 
        : `전체 1회독 중 [${currentIndex + 1}/${currentRoundPool.length}]`;

    progressText.innerText = `마스터: ${masterCount} / ${filteredQuizData.length}  |  ${modeBadge}`;
}

function showAnswer() { 
    if (!currentQuiz) return;
    jpTextEl.innerText = currentQuiz.jp; 
    metaTextEl.innerText = currentQuiz.meta ? `💡 Tip: ${currentQuiz.meta}` : ""; 
    answerEl.classList.add("reveal"); 
    showAnswerBtn.style.display = "none";
    evaluationButtons.style.display = "flex"; 
    playAudio(); 
}

// ====================
// 💡 깔끔해진 2버튼 평가 시스템
// ====================
function evaluateAnswer(type) {
    if (!currentQuiz) return;

    if (type === 'perfect') {
        userScores[currentQuiz.id] = 0; // 마스터 성공
    } else if (type === 'retry') {
        userScores[currentQuiz.id] = 1; // 복습 대기열 등록
    }
    
    saveScores();
    
    currentIndex++; 
    nextQuiz(); 
}

// ====================
// 단축키 시스템 (1: 바로맞춤, 2: 다시보기)
// ====================
document.addEventListener("keydown", (e) => {
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (showAnswerBtn.style.display !== "none") {
            showAnswer();
        }
    } else if (evaluationButtons.style.display !== "none") {
        if (e.code === "Digit1" || e.code === "Numpad1") {
            evaluateAnswer('perfect');
        } else if (e.code === "Digit2" || e.code === "Numpad2") {
            evaluateAnswer('retry');
        }
    }
});

// 앱 실행
loadCSV();

document.getElementById("homeBtn")?.addEventListener("click", () => {
    location.href = "https://tajunii.github.io/study-home/";
});