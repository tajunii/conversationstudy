// ====================
// 데이터
// ====================
let conversationData = [];
let currentIndex = 0;
let quizData = [];
let currentQuiz = null;

// ====================
// DOM 요소
// ====================
const menuPage = document.getElementById("menuPage");
const conversationPage = document.getElementById("conversationPage");
const quizPage = document.getElementById("quizPage");

const card = document.getElementById("card");
const question = document.getElementById("question");
const answer = document.getElementById("answer");

// ====================
// 페이지 전환
// ====================
function showPage(page){
    // 모든 페이지 숨기기
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    
    // 네비게이션 버튼 스타일 업데이트
    document.querySelectorAll("#nav button").forEach(btn => btn.classList.remove("active-nav"));
    const targetBtn = document.querySelector(`#nav button[onclick*="showPage('${page}')"]`);
    if(targetBtn) targetBtn.classList.add("active-nav");

    // 선택된 페이지만 보이기
    if(page === "menu") menuPage.classList.add("active");
    
    if(page === "conversation") {
        conversationPage.classList.add("active");
        showConversation();
    }
    
    if(page === "quiz") {
        quizPage.classList.add("active");
        if (answer) answer.classList.remove("reveal");
        if(!currentQuiz) nextQuiz();
    }
}

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
    } else {
        console.warn("이 브라우저는 TTS를 지원하지 않습니다.");
    }
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
}

// ====================
// 회화
// ====================
function showConversation(){
    if(conversationData.length === 0){
        card.innerHTML = "데이터를 불러오는 중이거나 데이터가 없습니다.";
        return;
    }

    const item = conversationData[currentIndex];

    card.innerHTML = `
        <div class="card-japanese tts-clickable" onclick="speak('${item.jp.replace(/'/g, "\\'")}')">
            ${item.jp}
        </div>
        <div class="card-divider"></div>
        <div class="card-meaning">
            ${item.ko}
        </div>
    `;
}

function nextConversation(){
    if(conversationData.length === 0) return;
    currentIndex++;
    if(currentIndex >= conversationData.length){
        currentIndex = 0;
    }
    showConversation();
}

function prevConversation(){
    if(conversationData.length === 0) return;
    currentIndex--;
    if(currentIndex < 0){
        currentIndex = conversationData.length - 1;
    }
    showConversation();
}

// ====================
// 퀴즈
// ====================
function buildQuiz(){
    quizData = [];
    conversationData.forEach(item => {
        if(item.jp && item.ko) { // 빈 줄 방지
            quizData.push({
                question: item.ko,
                answer: item.jp
            });
        }
    });
}

function nextQuiz(){
    if(quizData.length === 0) return;
    
    const i = Math.floor(Math.random() * quizData.length);
    currentQuiz = quizData[i];

    question.innerHTML = currentQuiz.question;
    answer.innerHTML = "";
    answer.classList.remove("reveal");
}

function showAnswer(){
    if(!currentQuiz) return;

    answer.innerHTML = `
        <div class="tts-clickable" onclick="speak('${currentQuiz.answer.replace(/'/g, "\\'")}')">
            ${currentQuiz.answer}
        </div>
    `;
    answer.classList.add("reveal");
    
    speak(currentQuiz.answer);
}

// ====================
// 구글 스프레드시트 CSV 데이터 연동
// ====================
async function loadCSV(){
    try {
        const csvURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTUWrzsscnZ3sHRvSenqLY4o1c-mkvZLYV9GDTdhjvwkyBI7AYjkIRGFKX3Qjdftb7NL5m6HGnAYwS/pub?gid=619535186&single=true&output=csv";
        
        const res = await fetch(csvURL);
        const text = await res.text();
        
        // 첫 줄(헤더) 제외
        const rows = text.trim().split("\n").slice(1).filter(line => line.trim() !== "");
        
        conversationData = rows.map(line => {
            const cols = line.split(",").map(v => v.replace(/"/g,"").trim());
            return {
                jp: cols[6] || "",
                ko: cols[7] || ""
            };
        });
        
        buildQuiz();
        
        // 현재 활성화된 페이지 자동 업데이트
        const activePage = document.querySelector(".page.active");
        if (activePage && activePage.id === "conversationPage") {
            showConversation();
        } else if (activePage && activePage.id === "quizPage") {
            if(!currentQuiz) nextQuiz();
        }
    } catch (e) {
        console.error("데이터 로드 실패:", e);
        if(card) card.innerHTML = "데이터를 불러오는 데 실패했습니다. 링크를 확인해주세요.";
    }
}

// 앱 실행 시 데이터 불러오기
loadCSV();

const homeBtn = document.getElementById("homeBtn");

if (homeBtn) {

    homeBtn.addEventListener("click", () => {

        location.href =
        "https://tajunii.github.io/study-home/";

    });

}