let allMasterData = []; 
let filteredQuizData = []; 
let currentQuiz = null;
let lastQuestionId = null; // 연속 출제 방지용
let userScores = {};       // { "문제id": score } 저장용

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
const evaluationButtons = document.getElementById("evaluationButtons");
const progressText = document.getElementById("progressText");

// ====================
// 스코어 로컬 스토리지 관리
// ====================
function loadScores() {
    const saved = localStorage.getItem("quizScoresData");
    if (saved) {
        userScores = JSON.parse(saved);
    } else {
        userScores = {};
    }
}

function saveScores() {
    localStorage.setItem("quizScoresData", JSON.stringify(userScores));
}

function getScore(id) {
    return userScores[id] || 0; // 저장된 값이 없으면 기본값 0
}

function setScore(id, score) {
    userScores[id] = Math.max(0, score); // 최소 0 유지
    saveScores();
}

function resetScores() {
    if(confirm("모든 학습 기록(점수)을 0으로 초기화하시겠습니까?")) {
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
        
        loadScores(); // 학습 기록 불러오기
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
// 출제 로직 (가중치 랜덤 추첨 알고리즘)
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
        progressText.innerText = "0 / 0";
        return;
    }
    nextQuiz();
}

// 다음 문제 가중치 추첨
function nextQuiz() {
    updateMasteryRate();

    let pool = filteredQuizData;
    
    // 연속 출제 방지 (문제가 2개 이상일 때만 방지 적용)
    if (pool.length > 1 && lastQuestionId) {
        pool = pool.filter(item => item.id !== lastQuestionId);
    }

    // 가중치(Weight) 계산: 점수(score) + 1, 단 점수가 5 이상이면 최대 가중치 6
    let totalWeight = 0;
    const weightedPool = pool.map(item => {
        const score = getScore(item.id);
        const weight = score >= 5 ? 6 : score + 1;
        totalWeight += weight;
        return { item, weight };
    });

    // 룰렛 추첨 (Random 값에서 weight를 빼가며 선택)
    let random = Math.random() * totalWeight;
    let selectedItem = weightedPool[weightedPool.length - 1].item; // 기본값 (안전장치)
    
    for (let i = 0; i < weightedPool.length; i++) {
        random -= weightedPool[i].weight;
        if (random <= 0) {
            selectedItem = weightedPool[i].item;
            break;
        }
    }

    currentQuiz = selectedItem;
    lastQuestionId = currentQuiz.id;
    
    // UI 업데이트
    questionEl.innerText = currentQuiz.kr; 
    answerEl.classList.remove("reveal"); 
    showAnswerBtn.style.display = "block";
    evaluationButtons.style.display = "none"; // 평가 버튼 숨기기
}

function updateMasteryRate() {
    if(filteredQuizData.length === 0) return;
    const masterCount = filteredQuizData.filter(item => getScore(item.id) === 0).length;
    progressText.innerText = `마스터 🎯: ${masterCount} / ${filteredQuizData.length}`;
}

function showAnswer() { 
    jpTextEl.innerText = currentQuiz.jp; 
    metaTextEl.innerText = currentQuiz.meta ? `💡 Tip: ${currentQuiz.meta}` : ""; 
    answerEl.classList.add("reveal"); 
    showAnswerBtn.style.display = "none";
    evaluationButtons.style.display = "flex"; // 평가 버튼 보이기
    playAudio(); 
}

// ====================
// 평가 및 점수 업데이트
// ====================
function evaluateAnswer(type) {
    let currentScore = getScore(currentQuiz.id);
    
    if (type === 'perfect') {
        currentScore -= 2;
    } else if (type === 'slow') {
        currentScore += 1;
    } else if (type === 'wrong') {
        currentScore += 3;
    }
    
    setScore(currentQuiz.id, currentScore);
    nextQuiz(); // 바로 다음 문제로 이동
}

// ====================
// 단축키 지원 (편의성 극대화)
// ====================
document.addEventListener("keydown", (e) => {
    // 입력창 등에 포커스 되어 있을 땐 무시
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (showAnswerBtn.style.display !== "none") {
            showAnswer();
        }
    } else if (evaluationButtons.style.display !== "none") {
        // 정답이 표시되어 평가 버튼이 활성화된 상태일 때만 숫자 단축키 작동
        if (e.code === "Digit1" || e.code === "Numpad1") {
            evaluateAnswer('perfect');
        } else if (e.code === "Digit2" || e.code === "Numpad2") {
            evaluateAnswer('slow');
        } else if (e.code === "Digit3" || e.code === "Numpad3") {
            evaluateAnswer('wrong');
        }
    }
});

loadCSV();
document.getElementById("homeBtn")?.addEventListener("click", () => location.href = "https://tajunii.github.io/study-home/");