// ====================
// 전역 변수
// ====================
let allMasterData = []; 
let filteredQuizData = []; 
let currentIndex = 0;      
let currentQuiz = null;    

// ====================
// DOM 요소
// ====================
const categoryFilter = document.getElementById("categoryFilter");
const cycleFilter = document.getElementById("cycleFilter");
const questionEl = document.getElementById("question"); 
const answerEl = document.getElementById("answer"); 
const jpTextEl = document.getElementById("jpText"); 
const metaTextEl = document.getElementById("metaText"); 
const showAnswerBtn = document.getElementById("showAnswerBtn"); 
const nextQuestionBtn = document.getElementById("nextQuestionBtn");
const progressText = document.getElementById("progressText"); // 신규

// ====================
// 로컬 스토리지 (진행률 저장)
// ====================
function saveProgress() {
    if (filteredQuizData.length === 0) return;
    
    const state = {
        category: categoryFilter.value,
        cycle: cycleFilter.value,
        orderIds: filteredQuizData.map(item => item.id), // 현재 섞여있는 문제 ID 순서 저장
        currentIndex: currentIndex
    };
    localStorage.setItem("quizProgressState", JSON.stringify(state));
}

function loadProgress() {
    const saved = localStorage.getItem("quizProgressState");
    if (saved) return JSON.parse(saved);
    return null;
}

// ====================
// GitHub 오디오 파일 재생
// ====================
let currentAudio = null; 

function playAudio() {
    if (!currentQuiz) return;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    const fileName = currentQuiz.audio;
    if (!fileName) return;

    const audioUrl = `https://raw.githubusercontent.com/tajunii/conversationstudy/main/audio/${fileName}`;
    currentAudio = new Audio(audioUrl);
    
    currentAudio.play().catch(error => console.error("음성 파일 재생 실패:", error));
}

// ====================
// CSV 파싱 규칙
// ====================
function parseCSVLine(line) {
    let result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === "," && !inQuotes) { result.push(current); current = ""; } 
        else { current += c; }
    }
    result.push(current);
    return result.map(v => v.trim());
}

// ====================
// CSV 데이터 로드
// ====================
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
        
        populateFilters();
        initializeFromSavedStateOrStart(); 
    } catch (e) {
        questionEl.innerText = "데이터를 불러오는 데 실패했습니다.";
    }
}

// ====================
// 다중 필터 생성 (카테고리 & 학습주기)
// ====================
function populateFilters() {
    // 카테고리 추출
    const uniqueCats = [...new Set(allMasterData.map(item => item.category).filter(Boolean))];
    uniqueCats.forEach(c => {
        const option = document.createElement("option");
        option.value = c; option.innerText = c;
        categoryFilter.appendChild(option);
    });

    // Cycle(학습주기) 추출
    const uniqueCycles = [...new Set(allMasterData.map(item => item.cycle).filter(Boolean))];
    uniqueCycles.forEach(c => {
        const option = document.createElement("option");
        option.value = c; option.innerText = c;
        cycleFilter.appendChild(option);
    });
}

// ====================
// 초기화 로직 (저장된 진행률 복구)
// ====================
function initializeFromSavedStateOrStart() {
    const savedState = loadProgress();

    if (savedState) {
        // 필터 UI 복구
        categoryFilter.value = savedState.category || "전체";
        cycleFilter.value = savedState.cycle || "전체";
        
        // 저장된 순서대로 데이터 복구
        const restoredData = [];
        savedState.orderIds.forEach(savedId => {
            const foundItem = allMasterData.find(item => item.id === savedId);
            if (foundItem) restoredData.push(foundItem);
        });

        if (restoredData.length > 0) {
            filteredQuizData = restoredData;
            currentIndex = savedState.currentIndex < filteredQuizData.length ? savedState.currentIndex : 0;
            nextQuiz(false); // UI 업데이트
            return;
        }
    }
    
    // 저장된 내역이 없거나 유효하지 않으면 새롭게 시작
    applyFiltersAndStart(true); 
}

// 필터 변경 시 감지 (새로운 조합으로 시작)
function changeFilter() {
    applyFiltersAndStart(true); // 필터를 바꾸면 기본적으로 랜덤 섞기로 새로 시작
}

// ====================
// 퀴즈 준비 및 섞기 (핵심 로직)
// ====================
function applyFiltersAndStart(isRandom = true) {
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
        nextQuestionBtn.style.display = "none";
        progressText.innerText = "0 / 0";
        return;
    }

    if (isRandom) {
        for (let i = filteredQuizData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filteredQuizData[i], filteredQuizData[j]] = [filteredQuizData[j], filteredQuizData[i]];
        }
    } else {
        // 순차 정렬 (ID 기준 오름차순)
        filteredQuizData.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    }

    currentIndex = 0; 
    nextQuiz();
}

// 사용자 직접 리셋 버튼 클릭 시
function restartQuiz(isRandom) {
    if(confirm(isRandom ? "진행률을 초기화하고 무작위로 섞으시겠습니까?" : "진행률을 초기화하고 1번부터 순서대로 시작하시겠습니까?")) {
        applyFiltersAndStart(isRandom);
    }
}

// ====================
// 문제 출제
// ====================
function nextQuiz(isAdvancing = true) {
    if (filteredQuizData.length === 0) return;

    if (currentIndex >= filteredQuizData.length) {
        alert("선택한 범위의 모든 학습을 완료했습니다! 자동으로 다시 섞어 시작합니다.");
        applyFiltersAndStart(true);
        return;
    }

    currentQuiz = filteredQuizData[currentIndex];
    
    // UI 업데이트
    questionEl.innerText = currentQuiz.kr; 
    answerEl.classList.remove("reveal"); 
    showAnswerBtn.style.display = "block";
    nextQuestionBtn.style.display = "none";
    
    // 진행률 텍스트 업데이트
    progressText.innerText = `진행률: ${currentIndex + 1} / ${filteredQuizData.length}`;

    // 상태 저장
    saveProgress();
}

// ====================
// 정답 보기
// ====================
function showAnswer() { 
    jpTextEl.innerText = currentQuiz.jp; 
    metaTextEl.innerText = currentQuiz.meta ? `💡 Tip: ${currentQuiz.meta}` : ""; 
    
    answerEl.classList.add("reveal"); 
    showAnswerBtn.style.display = "none";
    nextQuestionBtn.style.display = "block";
    
    playAudio(); 
    currentIndex++; // 다음 문제 인덱스 증가
    saveProgress(); // 여기서 저장해두면 앱을 껐다 켰을 때 정답을 확인한 문제는 패스됨
}

// ====================
// 💡 조언 적용: 키보드 단축키 지원 (편의성 극대화)
// ====================
document.addEventListener("keydown", (e) => {
    // 스페이스바(Space) 또는 엔터(Enter)를 누를 경우 진행
    if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault(); // 화면 스크롤 방지
        if (showAnswerBtn.style.display !== "none") {
            showAnswer();
        } else if (nextQuestionBtn.style.display !== "none") {
            nextQuiz();
        }
    }
});

// 앱 실행
loadCSV();

const homeBtn = document.getElementById("homeBtn");
if (homeBtn) {
    homeBtn.addEventListener("click", () => {
        location.href = "https://tajunii.github.io/study-home/";
    });
}