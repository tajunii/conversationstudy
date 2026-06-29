// ====================
// 전역 변수
// ====================
let allMasterData = []; 
let filteredQuizData = [];
let currentQuiz = null;

// ====================
// DOM 요소
// ====================
const setupPage = document.getElementById("setupPage");
const quizPage = document.getElementById("quizPage");
const statusMessage = document.getElementById("statusMessage");

const typeFilter = document.getElementById("typeFilter");
const quizBadge = document.getElementById("quizBadge");
const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const jpTextEl = document.getElementById("jpText");
const metaTextEl = document.getElementById("metaText");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const feedbackControls = document.getElementById("feedbackControls");
const homeBtn = document.getElementById("homeBtn");

// ====================
// TTS (음성 합성)
// ====================
function speak(text, lang = 'ja-JP') {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        
        const voices = window.speechSynthesis.getVoices();
        const jpVoice = voices.find(v => v.lang.includes('ja-JP') || v.lang.includes('ja_JP'));
        if (jpVoice) utterance.voice = jpVoice;
        
        window.speechSynthesis.speak(utterance);
    }
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
}

// ====================
// 필터 자동 생성 로직 (추가된 부분)
// ====================
function populateFilters() {
    const typeFilter = document.getElementById("typeFilter");
    const categoryFilter = document.getElementById("categoryFilter");

    // 1. 데이터에서 type과 category만 추출하여 중복 제거 (Set 활용)
    const uniqueTypes = [...new Set(allMasterData.map(item => item.type).filter(Boolean))];
    const uniqueCategories = [...new Set(allMasterData.map(item => item.category).filter(Boolean))];

    // 2. 대분류(Type) 옵션 동적 추가
    uniqueTypes.forEach(t => {
        const option = document.createElement("option");
        option.value = t;
        option.innerText = t;
        typeFilter.appendChild(option);
    });

    // 3. 소분류(Category) 옵션 동적 추가
    uniqueCategories.forEach(c => {
        const option = document.createElement("option");
        option.value = c;
        option.innerText = c;
        categoryFilter.appendChild(option);
    });
}

// ====================
// CSV 데이터 로드 (수정된 부분)
// ====================
async function loadCSV(){
    try {
        const csvURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTUWrzsscnZ3sHRvSenqLY4o1c-mkvZLYV9GDTdhjvwkyBI7AYjkIRGFKX3Qjdftb7NL5m6HGnAYwS/pub?gid=619535186&single=true&output=csv";
        
        const res = await fetch(csvURL);
        const text = await res.text();
        
        const rows = text.trim().split("\n").filter(line => line.trim() !== "");
        // 사용자가 명시한 실제 헤더(id, type, category, group, cycle, week, jp, kr, audio, meta)를 기준으로 매핑
        const headers = rows[0].split(",").map(v => v.replace(/"/g,"").trim().toLowerCase());
        
        allMasterData = rows.slice(1).map((line, index) => {
            const cols = line.split(",").map(v => v.replace(/"/g,"").trim());
            let obj = {}; 
            
            headers.forEach((header, i) => {
                obj[header] = cols[i] || "";
            });
            
            // 만약 id가 비어있다면 임시 부여
            if (!obj.id) obj.id = index + 1;
            
            // LocalStorage 오답 기록 연동
            obj.errorCount = parseInt(localStorage.getItem(`err_${obj.id}`)) || 0;
            
            return obj;
        });
        
        // 데이터 로딩 완료 후, 필터(드롭다운) 옵션을 자동으로 채움
        populateFilters();
        
        statusMessage.innerText = `데이터 로딩 완료! (총 ${allMasterData.length}문장)`;
    } catch (e) {
        console.error("데이터 로드 실패:", e);
        statusMessage.innerText = "데이터를 불러오는 데 실패했습니다. 링크를 확인해주세요.";
    }
}

// ====================
// 퀴즈 로직 (수정된 부분: 다중 조건 필터링)
// ====================
function startQuiz() {
    const selectedType = document.getElementById("typeFilter").value;
    const selectedCategory = document.getElementById("categoryFilter").value;
    
    // Type과 Category 두 가지 조건을 모두 만족하는 데이터만 걸러냄 (AND 조건)
    filteredQuizData = allMasterData.filter(item => {
        const matchType = (selectedType === "전체") || (item.type === selectedType);
        const matchCategory = (selectedCategory === "전체") || (item.category === selectedCategory);
        
        return matchType && matchCategory;
    });

    if (filteredQuizData.length === 0) {
        alert("선택하신 조건에 맞는 문장이 없습니다. 다른 카테고리를 선택해 주세요.");
        return;
    }

    setupPage.classList.remove("active");
    quizPage.classList.add("active");
    
    nextQuiz();
}

// ====================
// 피드백 (맞음/틀림) 로직
// ====================
function submitFeedback(isCorrect) {
    let currentErr = currentQuiz.errorCount;
    
    if (!isCorrect) {
        currentQuiz.errorCount = currentErr + 1;
        localStorage.setItem(`err_${currentQuiz.id}`, currentQuiz.errorCount);
    } else {
        if (currentErr > 0) {
            currentQuiz.errorCount = currentErr - 1;
            localStorage.setItem(`err_${currentQuiz.id}`, currentQuiz.errorCount);
        }
    }
    
    nextQuiz();
}

// ====================
// 페이지 이동 제어
// ====================
function goToSetup() {
    quizPage.classList.remove("active");
    setupPage.classList.add("active");
}

if (homeBtn) {
    homeBtn.addEventListener("click", () => {
        location.href = "https://tajunii.github.io/study-home/";
    });
}

// 앱 실행 시 데이터 로드
loadCSV();