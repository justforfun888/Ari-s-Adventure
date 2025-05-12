// 게임 요소들
const character = document.getElementById('character');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const gameOverMessage = document.getElementById('game-over');
const startScreen = document.getElementById('start-screen');
const playBtn = document.getElementById('play-btn');
const gameContainer = document.querySelector('.game-container');

// 게임 변수
let isJumping = false;
let score = 0;
let highScore = 0;
let gameIsOver = false;
let gameStarted = false;
let obstacleInterval;
let scoreInterval;
let lastObstacleTime = 0;
let activeObstacles = [];
let lastCollidedObstacle = null; // 충돌한 장애물 저장 변수

// 게임 속도 관련 변수
let baseSpeed = 3.19; // 초기 게임 속도 (기존 2.9의 10% 증가)
let currentSpeed = baseSpeed; // 현재 게임 속도
let maxSpeedFactor = 1.5; // 최대 속도 증가 비율 (초기 속도의 30% 추가)
let speedIncreaseFactor = 0.01; // 점수당 속도 증가량

// 최고 점수 불러오기
function loadHighScore() {
    const savedData = localStorage.getItem('jumpGameHighScore');
    if (savedData !== null) {
        try {
            const scoreData = JSON.parse(savedData);
            const currentTime = Date.now();
            const savedTime = scoreData.timestamp || 0;
            const sixHoursInMs = 6 * 60 * 60 * 1000; // 6시간을 밀리초로 변환

            // 6시간이 지나지 않았고 유효한 점수가 있는 경우에만 최고 점수 로드
            if (currentTime - savedTime < sixHoursInMs && scoreData.score) {
                highScore = scoreData.score;
            } else {
                highScore = 0; // 6시간이 지났거나 유효하지 않은 경우 0으로 초기화
            }
            updateHighScoreDisplay();
        } catch (e) {
            // 기존 형식으로 저장된 데이터 처리 (이전 버전 호환성)
            const oldScore = parseInt(savedData);
            if (!isNaN(oldScore)) {
                highScore = oldScore;
                // 새로운 형식으로 다시 저장
                saveHighScore();
            }
            updateHighScoreDisplay();
        }
    }
}

// 최고 점수 저장하기
function saveHighScore() {
    const scoreData = {
        score: highScore,
        timestamp: Date.now() // 현재 시간 저장
    };
    localStorage.setItem('jumpGameHighScore', JSON.stringify(scoreData));
}

// 최고 점수 표시 업데이트
function updateHighScoreDisplay() {
    highScoreDisplay.textContent = 'HI ' + String(highScore).padStart(5, '0');
}

// 장애물 이미지 배열 (여러 이미지 경로 추가)
const obstacleImages = [
    'obstacle1.png',
    'obstacle2.png',
    'obstacle3.png',
    'obstacle4.png' // 새 장애물 추가
];

// 점프 함수 - 부드러운 점프로 개선 및 속도 50% 감소
function jump() {
    if (isJumping || gameIsOver || !gameStarted) return;
    
    isJumping = true;
    
    // 점프 이미지로 변경하고 달리기 애니메이션 중지
    character.style.backgroundImage = "url('character-jump.png')";
    character.style.animation = "none";
    
    // 부드러운 점프를 위한 변수
    let jumpTime = 0;
const jumpDuration = 90; // 점프 전체 시간 10% 감소 (100 → 90)
const jumpHeight = 145 - 40; // 순수 점프 높이 (최대 높이 - 시작 높이)
const baseHeight = 40; // 기본 높이 (바닥에서)
    
    // 점프 애니메이션 함수
    function animateJump() {
        if (gameIsOver) {
            isJumping = false;
            return;
        }
        
        if (jumpTime <= jumpDuration) {
            // 사인 곡선을 사용한 부드러운 점프 (0 ~ π 구간)
            const normalizedTime = jumpTime / jumpDuration; // 0~1 사이 값
            const sinValue = Math.sin(normalizedTime * Math.PI);
            const newHeight = baseHeight + (sinValue * jumpHeight);
            
            character.style.bottom = newHeight + 'px';
            jumpTime++;
            requestAnimationFrame(animateJump);
        } else {
            // 점프 완료
            isJumping = false;
            character.style.bottom = baseHeight + 'px';
            character.style.backgroundImage = "";
            character.style.animation = "run 0.215s infinite";
        }
    }
    
    // 애니메이션 시작
    requestAnimationFrame(animateJump);
}


// 장애물 생성 함수 - 버그 수정 및 안정성 개선
function createObstacle() {
    if (gameIsOver || !gameStarted) return;
    
    // 활성 장애물 배열 정리 (화면에서 나간 장애물 제거)
    activeObstacles = activeObstacles.filter(obs => {
        const isVisible = document.body.contains(obs);
        if (!isVisible) {
            return false; // 화면에서 제거된 장애물은 배열에서도 제거
        }
        return true;
    });
    
    const containerWidth = gameContainer.offsetWidth;
    // 최소 거리를 랜덤하게 설정 (200px ~ 400px)
    const minimumDistance = Math.floor(Math.random() * 200) + 200;
    
    // 최근 장애물이 충분히 이동했는지 확인
    let canCreateObstacle = true;

    if (activeObstacles.length > 0) {
        const lastObstacle = activeObstacles[activeObstacles.length - 1];
        if (lastObstacle && document.body.contains(lastObstacle)) {
            const lastRect = lastObstacle.getBoundingClientRect();
            const containerRect = gameContainer.getBoundingClientRect();
            const distanceTraveled = containerRect.right - lastRect.right;
            
            // 게임 속도를 고려한 동적 최소 거리 계산
            // 점프 시간(90ms)과 현재 속도를 고려하여 안전 거리 계산
            const jumpDistance = (currentSpeed * 90) / 16.67; // 90ms 동안 이동할 거리
            const safetyMargin = jumpDistance * 1.5; // 안전 마진 추가
            const dynamicMinDistance = Math.max(minimumDistance, safetyMargin);
            
            // 마지막 장애물이 최소 거리보다 덜 이동했으면 생성 불가
            if (distanceTraveled < dynamicMinDistance) {
                canCreateObstacle = false;
            }
        }
    }
    
    if (canCreateObstacle) {
        // 랜덤 장애물 인덱스 선택
        const randomIndex = Math.floor(Math.random() * obstacleImages.length);
        
        // 새 장애물 요소 생성
        const obstacle = document.createElement('div');
        obstacle.classList.add('obstacle');
        
        // 랜덤 장애물 이미지 설정
        obstacle.style.backgroundImage = `url('${obstacleImages[randomIndex]}')`;
        
        // 장애물 초기 위치 설정
        obstacle.style.right = '0px';
        
        // 게임 컨테이너에 장애물 추가
        gameContainer.appendChild(obstacle);
        
        // 활성 장애물 배열에 추가
        activeObstacles.push(obstacle);
        
        // 장애물 이동 함수
        function moveObstacle() {
            if (gameIsOver) {
                if (document.body.contains(obstacle)) {
                    obstacle.remove();
                }
                return;
            }
            
            if (!document.body.contains(obstacle)) {
                return; // 이미 제거된 장애물은 처리하지 않음
            }
            
            // 현재 위치 가져오기
            const currentPosition = parseInt(obstacle.style.right) || 0;
            
            // 충돌 감지
            if (checkCollision(obstacle)) {
                gameOver();
                return;
            }
            
            // 장애물이 화면을 벗어나면 제거
            if (currentPosition > containerWidth) {
                obstacle.remove();
                const index = activeObstacles.indexOf(obstacle);
                if (index > -1) {
                    activeObstacles.splice(index, 1);
                }
            } else {
                // 장애물 이동
                obstacle.style.right = (currentPosition + currentSpeed) + 'px';
                requestAnimationFrame(moveObstacle);
            }
        }
        
        requestAnimationFrame(moveObstacle);
    }
    
    // 다음 장애물 생성 시도 (빈도 20% 증가)
    // 기존: Math.floor(Math.random() * 680) + 1000 (1000-1680ms)
    // 변경: Math.floor(Math.random() * 544) + 800 (800-1344ms)
    const nextObstacleTime = Math.floor(Math.random() * 544) + 800;
    
    // 중요: 여기서 반드시 새로운 장애물 생성 일정 예약
    const obstacleTimerId = setTimeout(() => {
        if (!gameIsOver && gameStarted) {
            createObstacle();
        }
    }, nextObstacleTime);
    
    // 게임 오버 시 타이머 정리를 위해 ID 저장
    if (!window.obstacleTimerIds) {
        window.obstacleTimerIds = [];
    }
    window.obstacleTimerIds.push(obstacleTimerId);
}

// 충돌 감지 함수
function checkCollision(obstacle) {
    const characterRect = character.getBoundingClientRect();
    const obstacleRect = obstacle.getBoundingClientRect();
    
    // 실제 충돌 영역을 약간 줄여서 난이도 감소
    const characterHitbox = {
        left: characterRect.left + 5,
        right: characterRect.right - 5,
        top: characterRect.top + 5,
        bottom: characterRect.bottom - 5
    };
    
    const obstacleHitbox = {
        left: obstacleRect.left + 5,
        right: obstacleRect.right - 5,
        top: obstacleRect.top + 5,
        bottom: obstacleRect.bottom - 5
    };
    
    const collision = !(
        characterHitbox.right < obstacleHitbox.left || 
        characterHitbox.left > obstacleHitbox.right || 
        characterHitbox.bottom < obstacleHitbox.top || 
        characterHitbox.top > obstacleHitbox.bottom
    );
    
    // 충돌했으면 장애물 저장
    if (collision) {
        lastCollidedObstacle = obstacle;
    }
    
    return collision;
}

// 배경 이동 함수
function moveBackground() {
    if (gameIsOver || !gameStarted) return;
    
    // 배경 위치 가져오기
    const currentPos = parseInt(getComputedStyle(gameContainer).backgroundPositionX) || 0;
    
    // 배경 이동 - 가변 속도 적용
    gameContainer.style.backgroundPositionX = (currentPos - currentSpeed) + 'px';
    
    requestAnimationFrame(moveBackground);
}


// 점수 업데이트 함수
function updateScore() {
    if (gameIsOver || !gameStarted) return;
    
    score++;
    scoreDisplay.textContent = String(score).padStart(5, '0');
    
    // 점수에 따른 게임 속도 증가 (최대 30%까지)
    const targetSpeed = baseSpeed * Math.min(maxSpeedFactor, 1 + (score * speedIncreaseFactor));
    
    // 속도를 부드럽게 증가 (갑자기 바뀌지 않도록)
    currentSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.2;
}

// 게임 오버 함수
function gameOver() {
    gameIsOver = true;
    gameStarted = false;
    
    // 장애물 생성 타이머 모두 정리
    if (window.obstacleTimerIds) {
        window.obstacleTimerIds.forEach(id => clearTimeout(id));
        window.obstacleTimerIds = [];
    }
    
    // 모든 인터벌 정지
    clearInterval(scoreInterval);
    
    // 캐릭터 애니메이션 중지 및 이미지 변경
    character.style.animation = "none";
    character.style.backgroundImage = "url('character-over.png')";
    
    // 마지막 장애물 옆에 캐릭터 위치 조정
    if (lastCollidedObstacle) {
        const obstacleRect = lastCollidedObstacle.getBoundingClientRect();
        const characterRect = character.getBoundingClientRect();
        const containerRect = gameContainer.getBoundingClientRect();
        
        // 장애물 왼쪽 edge에 캐릭터 배치
        const obstacleLeftPosition = obstacleRect.left - containerRect.left;
        const characterLeftPosition = obstacleLeftPosition - characterRect.width;
        
        // 캐릭터 위치 조정
        character.style.left = characterLeftPosition + 'px';
        character.style.bottom = '40px'; // 바닥 높이 유지
    }
    
    // 최고 점수 갱신 확인
    if (score > highScore) {
        highScore = score;
        saveHighScore();
        updateHighScoreDisplay();
    }
    
    // 게임 오버 메시지 표시
    gameOverMessage.classList.remove('hidden');
    // 시작화면은 계속 숨김 상태로 유지
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';
}

// 게임 재시작 함수
function restartGame() {
    // 모든 장애물 제거
    document.querySelectorAll('.obstacle').forEach(obs => obs.remove());
    
    // 변수 초기화
    gameIsOver = false;
    score = 0;
    activeObstacles = []; // 활성 장애물 배열 초기화
    character.style.bottom = '40px'; // 바닥에서 40px 위로 설정
    scoreDisplay.textContent = '00000';
    currentSpeed = baseSpeed;
    
    // 캐릭터 애니메이션 초기화
    character.style.backgroundImage = "";
    character.style.animation = "run 0.215s infinite"; // 애니메이션 속도 35% 더 빠르게
    character.style.left = '50px'; // 캐릭터 수평 위치 초기화
    
    // 게임 오버 메시지 숨기기
    gameOverMessage.classList.add('hidden');
    
    // 게임 시작
    startGame();
}

// 게임 시작 함수
function startGame() {
    // 기존의 모든 장애물 타이머 정리
    if (window.obstacleTimerIds) {
        window.obstacleTimerIds.forEach(id => clearTimeout(id));
        window.obstacleTimerIds = [];
    }
    
    gameStarted = true;
    gameIsOver = false;
    activeObstacles = []; // 활성 장애물 배열 초기화

    // 시작화면 확실히 숨기기 (두 가지 방법 모두 사용)
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';

    // 게임오버화면 숨김
    gameOverMessage.classList.add('hidden');

    // 점수 초기화
    score = 0;
    scoreDisplay.textContent = '00000';
    currentSpeed = baseSpeed;

    // 캐릭터 애니메이션 초기화
    character.style.backgroundImage = "";
    character.style.animation = "run 0.215s infinite"; // 애니메이션 속도 35% 더 빠르게
    character.style.bottom = '40px'; // 바닥에서 40px 위로 설정
    character.style.left = '50px'; // 캐릭터 수평 위치 초기화

    // 장애물 제거
    document.querySelectorAll('.obstacle').forEach(obs => obs.remove());

    // 점수 인터벌 시작
    scoreInterval = setInterval(updateScore, 100);

    // 장애물, 배경 시작
    createObstacle();
    requestAnimationFrame(moveBackground);
}

// 이벤트 리스너
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (!gameStarted && !gameIsOver) {
            startGame();
        } else if (!gameIsOver) {
            jump();
        } else if (gameIsOver) {
            // 게임 오버 상태에서 스페이스바로도 재시작 가능
            restartGame();
        }
    }
});

document.addEventListener('touchstart', function(event) {
    // 화면 확대 방지
    event.preventDefault();
    
    if (!gameStarted && !gameIsOver) {
        startGame();
    } else if (!gameIsOver) {
        jump();
    } else if (gameIsOver) {
        // 게임 오버 상태에서 터치로도 재시작 가능
        restartGame();
    }
});

// 클릭 이벤트 분리 (버튼 외에 게임화면 클릭)
document.addEventListener('click', function(event) {
    // 이미 시작된 게임에서만 점프 처리
    if (gameStarted && !gameIsOver && 
        event.target !== playBtn) {
        jump();
    } else if (gameIsOver) {
        // 게임 오버 상태에서 클릭으로도 재시작 가능
        restartGame();
    }
});

// 게임 시작 버튼 클릭 - 별도 처리
playBtn.addEventListener('click', function(event) {
    // 이벤트 전파 방지
    event.stopPropagation();
    event.preventDefault();
    
    startGame();
});

// 게임 오버 메시지 클릭 시 재시작
gameOverMessage.addEventListener('click', function(event) {
    // 이벤트 전파 방지
    event.stopPropagation();
    event.preventDefault();
    
    restartGame();
});

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
    // 최고 점수 불러오기
    loadHighScore();
    
    // 게임 초기화
    gameStarted = false;
    gameIsOver = false;
    activeObstacles = []; // 활성 장애물 배열 초기화
    
    // 시작 화면 확실히 표시
    startScreen.classList.remove('hidden');
    startScreen.style.display = 'flex';
    
    // 게임 오버 화면 숨기기
    gameOverMessage.classList.add('hidden');

// 화면 크기에 따른 게임 요소 크기 조정 함수
function resizeGameElements() {
    const gameWidth = gameContainer.offsetWidth;
    const gameHeight = gameContainer.offsetHeight;
    
    // 원래 크기에 대한 비율 계산
    const widthRatio = gameWidth / 900;
    const heightRatio = gameHeight / 340;
    
    // 캐릭터 크기 조정
    character.style.width = (44 * widthRatio) + 'px';
    character.style.height = (47 * heightRatio) + 'px';
    
    // 장애물 크기 조정 (이미 생성된 장애물에 적용)
    document.querySelectorAll('.obstacle').forEach(obs => {
      obs.style.width = (25 * widthRatio) + 'px';
      obs.style.height = (35 * heightRatio) + 'px';
    });
  }
  
  // 페이지 로드 및 리사이즈 시 요소 크기 조정
  window.addEventListener('load', resizeGameElements);
  window.addEventListener('resize', resizeGameElements);

});

