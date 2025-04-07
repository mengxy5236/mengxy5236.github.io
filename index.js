const musicConfig = {
  default: 'assets/background1.mp3',
  selected: null,
  volume: 0.5
};
let startScreen; 
document.addEventListener("DOMContentLoaded", () => {
  // 获取所有需要的DOM元素
  startScreen = document.getElementById("start-screen");
  const rulesScreen = document.getElementById("rules-screen");
  const gameScreen = document.getElementById("game-screen");
  const resultScreen = document.getElementById("result-screen");

  const startBtn = document.getElementById("start-btn");
  const rulesContent = document.querySelector(".rules-content");
  const rulesFooter = document.querySelector(".rules-footer");
  const timer = document.getElementById("timer");
  const circleNumber = document.getElementById("circle-number");
  const jokerTarget = document.getElementById("joker-target");
  const hits = document.getElementById("hits");
  const finalHits = document.getElementById("final-hits");
  const resultImage = document.getElementById("result-image");
  const resultMessage = document.getElementById("result-message");
  const musicControlBtn = document.querySelector(".music-control");
  const musicControlImg = musicControlBtn.querySelector("img");
  function initMusicSelection() {
    const musicScreen = document.getElementById('music-select-screen');
    const options = document.querySelectorAll('.music-option');
    const confirmBtn = document.querySelector('.confirm-music');
  
    options.forEach(option => {
      option.addEventListener('click', function() {
        options.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        musicConfig.selected = this.dataset.music;
      });
    });
  
    confirmBtn.addEventListener('click', function() {
      if (!musicConfig.selected) {
        musicConfig.selected = musicConfig.default;
      }
      localStorage.setItem('selectedMusic', musicConfig.selected);
      
      // 根据是否看过规则跳转
      if (!hasSeenRules) {
        showScreen(rulesScreen);
        localStorage.setItem("hasSeenRules", "true");
        hasSeenRules = true;
      } else {
        showScreen(gameScreen);
        startCountdown();
      }
      initBackgroundMusic();
    });
  }
  // 修改后的初始化背景音乐函数
function initBackgroundMusic() {
  const selectedMusic = localStorage.getItem('selectedMusic') || musicConfig.default;
  backgroundMusic.src = `assets/${selectedMusic}`;
  backgroundMusic.volume = musicConfig.volume;
  backgroundMusic.loop = true;
}
  // 游戏参数配置
  const gameConfig = {
    initialTimeLeft: 30.0, // 初始倒计时时间（秒）
    trapBtnShowSeconds: 5, // 礼物按钮显示时间（秒）
    trapBtnIntervalSeconds: 4 // 礼物按钮显示间隔（秒）
  };
  
  window.timeLeft = gameConfig.initialTimeLeft;
  let hits_count = 0;
  let gameStarted = false;
  let gameInterval;
  let moveInterval;
  let countdownInterval;
  let trapBtnInterval; // 礼物按钮定时器
  let hasSeenRules = localStorage.getItem("hasSeenRules") === "true";
  let devicePixelRatio = window.devicePixelRatio || 1;
  let lastMoveTime = 0;
  let isMoving = false;
  let isMusicOn = true;
  let trapBtnShowSeconds = gameConfig.trapBtnShowSeconds;
  let trapBtnIntervalSeconds = gameConfig.trapBtnIntervalSeconds;

  // 加载音效
  const winSound = new Audio("assets/win.mp3");
  const loseSound = new Audio("assets/lose.mp3");
  const backgroundMusic = new Audio("assets/background.mp3");
  backgroundMusic.loop = true;

  // 防止页面滚动和缩放
  function preventDefaultTouchBehavior() {
    document.addEventListener(
      "touchmove",
      function (e) {
        if (gameStarted) e.preventDefault();
      },
      { passive: false }
    );

    document.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length > 1) e.preventDefault(); // 防止多指触控
      },
      { passive: false }
    );

    // 防止双击缩放
    let lastTapTime = 0;
    document.addEventListener("touchend", function (e) {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
      }
      lastTapTime = currentTime;
    });
  }

  // 游戏规则文本
  const rulesText = `游戏规则：
  
1. 倒计时开始后，小丑会随机在页面中移动
2. 每次点击小丑后，移动速度会加快
3. 如果在倒计时结束前抓住小丑20次，就能将他关进监狱
4. 否则小丑就会逃脱`;


  rulesContent.textContent = rulesText;

  // 初始化UI
  function initializeUI() {
    localStorage.removeItem("hasSeenRules");//debug code
    console.log("初始化界面，hasSeenRules:", hasSeenRules);
    resetAllScreens();

    // 修复相同代码块的条件结构问题
    showScreen(startScreen);

    // 添加事件监听器
    startBtn.addEventListener("touchstart", handleStartButtonClick);
    startBtn.addEventListener("click", handleStartButtonClick);
    rulesFooter.addEventListener("touchstart", handleRulesConfirm);
    rulesFooter.addEventListener("click", handleRulesConfirm);
    jokerTarget.addEventListener("touchstart", handleJokerClick);
    jokerTarget.addEventListener("click", handleJokerClick);
    
    // 陷阱按钮事件
    const TrapBtn = document.getElementById("trap-btn");
    if (TrapBtn) {
      // 初始隐藏按钮
      TrapBtn.style.display = 'none';
      
      // 点击事件
      TrapBtn.addEventListener("click", function() {
        if (typeof window.forceTriggerTrap === 'function') {
          window.forceTriggerTrap();
        }
        // 点击后立即隐藏
        TrapBtn.style.display = 'none';
      });
    }

    // 始终先显示开始界面
    showScreen(startScreen);

    // 初始化小丑位置
    initializeJoker();

    // 防止默认触摸行为
    preventDefaultTouchBehavior();

    // 检测设备性能并调整
    detectDevicePerformance();

    // 为音乐控制按钮添加事件监听器
    musicControlBtn.addEventListener("click", handleMusicControlClick);
    musicControlBtn.addEventListener("touchstart", handleMusicControlClick);

    // 添加排行榜返回按钮事件
    document.getElementById('leaderboard-back-btn').addEventListener('click', () => {
      showScreen(startScreen); // 现在可以正确访问startScreen
    });

  }

  // 检测设备性能并调整
  function detectDevicePerformance() {
    // 检测设备像素比，用于调整特效数量
    devicePixelRatio = window.devicePixelRatio || 1;

    // 低端设备优化
    if (devicePixelRatio <= 1 || navigator.hardwareConcurrency <= 4) {
      // 减少特效，简化动画
      document.body.classList.add("low-performance");
    }
  }

  // 重置所有屏幕
  function resetAllScreens() {
    startScreen.style.display = "none";
    rulesScreen.style.display = "none";
    gameScreen.style.display = "none";
    resultScreen.style.display = "none";

    startScreen.classList.add("hidden");
    rulesScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
  }

  // 显示指定屏幕
  function showScreen(screen) {
    resetAllScreens();
    screen.style.display = "flex";
    screen.classList.remove("hidden");

    if (isMusicOn && (screen === startScreen || screen === gameScreen)) {
      backgroundMusic
        .play()
        .catch((err) => console.log("背景音乐播放失败:", err));
    } else {
      backgroundMusic.pause();
    }
  }

  // 音乐控制按钮点击事件
  function handleMusicControlClick(e) {
    e.preventDefault();
    e.stopPropagation();

    isMusicOn = !isMusicOn;

    if (isMusicOn) {
      musicControlImg.src = "./assets/music.png";
      if (
        startScreen.style.display === "flex" ||
        gameScreen.style.display === "flex"
      ) {
        backgroundMusic
          .play()
          .catch((err) => console.log("背景音乐播放失败:", err));
      }
    } else {
      backgroundMusic.pause();
      winSound.pause();
      loseSound.pause();
    }
  }

  // 开始按钮点击事件
  function handleStartButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log("开始按钮被点击，hasSeenRules:", hasSeenRules);
    // 显示音乐选择界面
    showScreen(document.getElementById('music-select-screen'));
    
  }

  // 规则确认点击事件
  function handleRulesConfirm(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log("规则确认按钮被点击");

    showScreen(gameScreen);
    circleNumber.style.display = "flex";
    startCountdown();
  }

  // 开始倒计时
  function startCountdown() {
    circleNumber.textContent = "3";
    circleNumber.style.display = "flex";
    let count = 3;
    countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        circleNumber.textContent = count;
      } else {
        clearInterval(countdownInterval);
        circleNumber.style.display = "none";
        startGame();
      }
    }, 1000);
  }
  
  // 初始化小丑位置
  function initializeJoker() {
    jokerTarget.style.left = "50%";
    jokerTarget.style.top = "50%";
    jokerTarget.style.transform = "translate(-50%, -50%)";
  }

  // 开始游戏
  function startGame() {
    gameStarted = true;
    hits_count = 0;
    timeLeft = gameConfig.initialTimeLeft; // 使用配置对象中的初始时间
    updateHits();

    localStorage.removeItem("gameWon");
    
    // 设置礼物按钮定时显示隐藏
    const TrapBtn = document.getElementById("trap-btn");
    if (TrapBtn) {
      // 初始隐藏按钮
      TrapBtn.style.display = 'none';
      
      // 清除之前的定时器（如果有）
      if (trapBtnInterval) {
        clearInterval(trapBtnInterval);
      }
      
      // 按照设定的时间间隔显示按钮
      trapBtnInterval = setInterval(function() {
        if (!gameStarted) {
          clearInterval(trapBtnInterval);
          return;
        }
      
        // 检查是否有陷阱正在激活
        if (typeof window.checkIfAnyTrapActive === 'function' && window.checkIfAnyTrapActive()) {
          console.log('有陷阱正在激活，不显示礼物按钮');
          return;
        }
      
        // 显示按钮
        TrapBtn.style.display = 'block';
      
        // 设置按钮隐藏的延迟
        setTimeout(function() {
          if (TrapBtn.style.display === 'block') { // 确保按钮当前是显示的
            TrapBtn.style.display = 'none';
          }
        }, trapBtnShowSeconds * 1000);
      }, trapBtnIntervalSeconds * 1000);
    }
    moveJoker();
    updateJokerSpeed();

    gameInterval = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 0.1);
      timer.textContent = timeLeft.toFixed(1);

      if (timeLeft <= 0) {
        const hasWon = localStorage.getItem("gameWon") === "true";
        endGame(hasWon);
      }
    }, 100);
  }

  // 更新小丑移动速度
  function updateJokerSpeed() {
    if (moveInterval) {
      clearInterval(moveInterval);
    }

    const baseSpeed = 900; // 降低基础速度，从800降低到600
    const minSpeed = 300; // 降低最小速度，从200降低到150
    const speedReduction = Math.min(hits_count * 40, baseSpeed - minSpeed);
    
    // 如果是游戏初始状态（点击次数为0），使用更快的初始速度
    let newSpeed;
    if (hits_count === 0) {
      newSpeed = 1000; // 初始速度设置为400毫秒，比默认的600毫秒更快
    } else {
      newSpeed = Math.max(minSpeed, baseSpeed - speedReduction);
    }
    
    // 保存当前速度，供陷阱系统使用
    window.currentMoveSpeed = newSpeed;
    console.log('当前游戏速度设置为:', newSpeed);

    moveInterval = setInterval(() => {
      moveJoker();
    }, newSpeed);
  }

  // 更新点击次数的显示
  function updateHits() {
    hits.textContent = hits_count;
    finalHits.textContent = hits_count;
  }

  // 获取小丑安全移动范围的函数
  function getSafeArea() {
    const header = document.querySelector(".header");
    const hitCount = document.querySelector(".hit-count");

    const headerHeight = header.offsetHeight;
    const hitCountHeight = hitCount.offsetHeight;
    const jokerSize = jokerTarget.offsetWidth;

    return {
      minX: jokerSize / 2,
      maxX: window.innerWidth - jokerSize / 2,
      minY: headerHeight + jokerSize / 2,
      maxY: window.innerHeight - hitCountHeight - jokerSize / 2,
    };
  }

  // 随机移动小丑的函数
  function moveJoker() {
    const now = Date.now();
    if (now - lastMoveTime < 100) return;
    lastMoveTime = now;

    const safeArea = getSafeArea();

    const newX =
      Math.random() * (safeArea.maxX - safeArea.minX) + safeArea.minX;
    const newY =
      Math.random() * (safeArea.maxY - safeArea.minY) + safeArea.minY;

    jokerTarget.style.transition = "left 0.2s ease-out, top 0.2s ease-out";
    jokerTarget.style.left = `${newX}px`;
    jokerTarget.style.top = `${newY}px`;

    setTimeout(() => {
      jokerTarget.style.transition = "";
    }, 200);
  }
  
let currentUsername = null;

async function showLeaderboard() {
  const requestOptions = {
    method: 'GET',
    redirect: 'follow'
  };

  try {
    const response = await fetch("http://main.vastsea.cc:41895/scores/leaderboard", requestOptions);
    const result = await response.json(); // 返回JSON数据
    
    // 渲染排行榜
    const container = document.querySelector('.leaderboard-list');
    container.innerHTML = result.map(item => `
      <div class="leaderboard-item">
        <span>${item.userName}</span>
        <span>${item.score}分</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载排行榜失败:', error);
  }
}

async function submitScore(score) {
  // 从弹窗获取用户名（保留你原有的交互逻辑）
  const username = prompt('请输入你的名字（最多20字）:', '匿名玩家') || '匿名玩家';
  
  // 使用新API格式
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    "userName": username.substring(0, 20), // 确保用户名不超过20字
    "score": parseInt(score) || 0          // 确保分数是数字
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  try {
    const response = await fetch("http://main.vastsea.cc:41895/scores", requestOptions);
    const result = await response.json(); // 根据实际返回格式选择.text()或.json()
    console.log('提交成功:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('提交失败:', error);
    return { success: false };
  }
}


  // 结束游戏
  async function endGame(won) {
    clearInterval(gameInterval);
    clearInterval(moveInterval);
    clearInterval(trapBtnInterval); // 清除礼物按钮定时器
    gameStarted = false;
    
    // 隐藏礼物按钮
    const TrapBtn = document.getElementById("trap-btn");
    if (TrapBtn) {
      TrapBtn.style.display = 'none';
    }

    

    backgroundMusic.pause();

    if (isMusicOn) {
      if (won) {
        winSound.play().catch((err) => console.log("胜利音效播放失败:", err));
      } else {
        loseSound.play().catch((err) => console.log("失败音效播放失败:", err));
      }
    }

    if (won) {
      resultImage.src = "./assets/joker-caught.png";
      resultMessage.textContent = `太棒了！你抓住了小丑！总共点击${hits_count}次`;
    } else {
      resultImage.src = "./assets/joker-escaped.png";
      resultMessage.textContent = `可惜，小丑逃走了！总共点击${hits_count}次`;
    }
    
    setTimeout(() => {
      showScreen(startScreen);  // 确保返回开始界面而不是音乐选择界面
      circleNumber.style.display = "flex";
      initializeJoker();
    }, 3000);

// 提交分数并显示结果
showScreen(resultScreen);

if (hits_count > 0) {
  const username = prompt('请输入你的名字（最多20字）:', '匿名玩家') || '匿名玩家';
  try {
    const data = await submitScore(hits_count); // 使用已定义的 submitScore 函数
    if (data.success) {
      await showLeaderboard(); // 提交成功后刷新排行榜
    }
  } catch (err) {
    console.error('分数提交失败:', err);
  }
}

  setTimeout(async () => {
    showScreen(document.getElementById('leaderboard-screen'));
    await showLeaderboard(); // 直接加载排行榜
  }, 3000); // 保持3秒后跳转

  }

  // 小丑点击事件处理函数
  function handleJokerClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!gameStarted) return;

    // 禁用点击事件，防止连续点击
    jokerTarget.style.pointerEvents = "none";
    
    // 增强震动反馈 - 移动设备上非常有效
    try {
      if (window.navigator && window.navigator.vibrate) {
        // 使用更强的震动模式 - 短-长-短模式，更容易被感知
        window.navigator.vibrate([40, 30, 100, 30, 40]);
      }
    } catch (err) {
      // 忽略震动API错误
      console.log("震动API不可用", err);
    }

    // 获取点击/触摸位置
    const touch = e.touches ? e.touches[0] : e;
    const rect = jokerTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 移动设备上的视觉反馈 - 使用更明显的变换
    jokerTarget.style.transform = "translate(-50%, -50%) scale(0.7)";
    jokerTarget.style.filter = "brightness(1.5) contrast(1.2)";
    
    // 创建特效增强视觉反馈
    createMobileEffect(centerX, centerY);
    
    // 更新击中次数
    
  if (window.trapState && window.trapState.isDoubleHitTrapActive) {
    hits_count += 2; // 双倍点击
    console.log('双倍点击生效，当前点击次数:', hits_count); // 调试日志
  } else {
    hits_count++; // 正常点击
    console.log('正常点击，当前点击次数:', hits_count); // 调试日志
  }
    updateHits();
    
    // 动画结束后恢复并移动小丑
    setTimeout(() => {
      jokerTarget.style.transform = "translate(-50%, -50%) scale(1)";
      jokerTarget.style.filter = "brightness(1) contrast(1)";
      jokerTarget.style.pointerEvents = "auto";
      
      // 移动小丑到新位置
      moveJoker();
    }, 300);

    // 更新小丑移动速度
    updateJokerSpeed();

    if (hits_count >=20) {
      localStorage.setItem("gameWon", "true");
    }
  }
  
  // 专为移动设备优化的特效
  function createMobileEffect(x, y) {
    // 获取游戏区域元素
    const gameArea = document.querySelector(".game-area");
    
    // 创建一个大的、明显的闪光效果
    const flash = document.createElement("div");
    flash.className = "mobile-flash";
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    gameArea.appendChild(flash);
    
    // 创建一个扩散的圆圈效果
    const ripple = document.createElement("div");
    ripple.className = "mobile-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    gameArea.appendChild(ripple);
    
    // 移除特效元素
    setTimeout(() => {
      flash.remove();
      ripple.remove();
    }, 500);
  }

  // 初始化游戏
  initializeJoker();
  initializeUI();
  initMusicSelection(); 
  initBackgroundMusic(); 
  // 设置初始倒计时显示
  document.getElementById('timer').textContent = gameConfig.initialTimeLeft.toFixed(1);
  
  // 初始化陷阱系统
  if (typeof window.initTrapSystem === 'function') {
    window.initTrapSystem();
  }
  


  // 添加调试按钮
  if (location.hash === "#debug") {
    const debugDiv = document.createElement("div");
    debugDiv.style.position = "fixed";
    debugDiv.style.bottom = "10px";
    debugDiv.style.left = "10px";
    debugDiv.style.zIndex = "1000";
    debugDiv.style.background = "rgba(0,0,0,0.7)";
    debugDiv.style.padding = "10px";
    debugDiv.style.borderRadius = "5px";

    const resetButton = document.createElement("button");
    resetButton.textContent = "重置游戏数据";
    resetButton.onclick = function () {
      localStorage.removeItem("hasSeenRules");
      location.reload();
    };

    debugDiv.appendChild(resetButton);
    document.body.appendChild(debugDiv);
  }
});
