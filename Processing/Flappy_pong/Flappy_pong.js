
/********* VARIABLES *********/
let gameScreen = 0;
let difficulty;
let backgroundX = 0;
let backgroundImage; // BackgroundImage class instance
let easyImg, mediumImg, hardImg, welcomeBackground, ScoreImage; // Image variables
let score = 0;
let lastAddTime = 0;
let lastWallTime = 0;
let gapHeight, wallSpeed;
let walls = [];
let ball, racket;
let currentWeather = "none"; 
let weatherTimer = 0;
let windParticles = [];
let windForce = 0;
let lastWindChange = 0; // Time of the last wind change
let healthBoost = null;
let wallCounter = 0; // Counter to track number of walls created
let qualifiesForTopFive = false; // Track if the player qualifies for top five
let usernameError = ""; // Stores username validation error
let pinError = "";      // Stores PIN validation error
let reminderMessage = "Keep a record of this username and PIN for future use."; // Reminder to keep info
let playerName = ""; // Stores the player's inputted username
let playerPin = ""; // Stores the player's inputted PIN
let activeField = "username"; // Keeps track of the currently active input field
let fetchFailed = false; // Flag to track if the fetch has failed
let gameOverTriggered = false; // New flag to track if game over has been triggered
let inputFieldsCreated = false; // Add a flag to prevent repeated creation

const gravity = 0.3;
const airfriction = 0.00001;
const friction = 0.1;
const maxHealth = 100;
const raindrops = [];
const windChangeInterval = 5000; // Wind changes every 5 seconds
const weatherChangeInterval = 5000;
const wallInterval = 1000;

/********* CLASS DEFINITIONS *********/
class Ball {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.speedVert = 0;
    this.speedHorizon = 0;
    this.health = maxHealth;
  }

  draw() {
    fill(this.color);
    ellipse(this.x, this.y, this.size, this.size);
  }
  
  decreaseHealth(amount = 2) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0 && !gameOverTriggered) {
      gameOverTriggered = true; // Prevent further calls
      //console.log("Health reached zero. Triggering game over.");
      gameOver(); // Call game over if health reaches zero
    }
  }

  applyGravity() {
    this.speedVert += gravity;
    this.y += this.speedVert;
    this.speedVert -= this.speedVert * airfriction;
  }

  keepInScreen() {
  if (this.y + this.size / 2 > height) {
    this.bounce(height - this.size / 2, "vertical"); // Bottom bounce
  }
  if (this.y - this.size / 2 < 0) {
    this.bounce(this.size / 2, "vertical"); // Top bounce
  }
  if (this.x - this.size / 2 < 0) {
    this.bounce(this.size / 2, "horizontal"); // Left bounce
  }
  if (this.x + this.size / 2 > width) {
    this.bounce(width - this.size / 2, "horizontal"); // Right bounce
  }
}

  bounce(surface, direction) {
  const maxSpeed = 10; // Limit maximum bounce speed
  const minSpeed = 0.5; // Ignore very small movements to stop jittering
  let multiplier = 1.02; // Default multiplier for difficulty

  if (difficulty === "medium") {
    multiplier = 1.10;
  } else if (difficulty === "hard") {
    multiplier = 1.15;
  }

  if (direction === "vertical") {
    this.y = surface + (this.size / 2) * (this.speedVert > 0 ? -1 : 1); // Correct position
    this.speedVert *= -multiplier * (1 - friction); // Reverse and apply friction
    this.speedVert = constrain(this.speedVert, -maxSpeed, maxSpeed); // Clamp speed
    if (Math.abs(this.speedVert) < minSpeed) {
      this.speedVert = 0; // Stop very small movements
    }
  } else if (direction === "horizontal") {
    this.x = surface + (this.size / 2) * (this.speedHorizon > 0 ? -1 : 1); // Correct position
    this.speedHorizon *= -multiplier * (1 - friction); // Reverse and apply friction
    this.speedHorizon = constrain(this.speedHorizon, -maxSpeed, maxSpeed); // Clamp speed
    if (Math.abs(this.speedHorizon) < minSpeed) {
      this.speedHorizon = 0; // Stop very small movements
    }
  }
}

  applyWeatherEffects() {
    if (currentWeather === "none"){
      return; // Skip if no weather effect
     }
    // Apply rain effects
    if (currentWeather === "rain" || currentWeather === "both") {
      this.speedVert *= 0.98; // Dampen vertical speed
      this.speedHorizon *= 0.98; // Dampen horizontal speed
    }
    // Apply wind effects
    if (currentWeather === "wind" || currentWeather === "both") {
      this.speedHorizon += windForce; // Push ball horizontally
    }
  }
}

class Racket {
  constructor(color, width, height) {
    this.color = color;
    this.width = width;
    this.height = height;
  }

  draw() {
    fill(this.color);
    rectMode(CENTER);
    rect(mouseX, mouseY, this.width, this.height, 5);
  }

  watchBounce(ball) {
    const overhead = mouseY - pmouseY;
    if (ball.x + ball.size / 2 > mouseX - this.width / 2 &&
        ball.x - ball.size / 2 < mouseX + this.width / 2) {
      if (dist(ball.x, ball.y, ball.x, mouseY) <= ball.size / 2 + abs(overhead)) {
       
        ball.bounce(mouseY - ball.size / 2, "vertical"); // Bounce vertically off the racket
        ball.speedHorizon = (ball.x - mouseX) / 10;
        
        if (overhead < 0) {
          
          ball.y += overhead / 2;
          ball.speedVert += overhead / 2;
          
        }
      }
    }
  }
}

class Wall {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.moveDirection = random([-1, 1]);
  }

  draw() {
    rectMode(CORNER);
    noStroke();
    fill(44, 62, 80);
    rect(this.x, 0, this.width, this.y, 0, 0, 15, 15);
    rect(this.x, this.y + this.height, this.width, height - (this.y + this.height), 15, 15, 0, 0);
  }

  move() {
    this.x -= wallSpeed;
    this.y += this.moveDirection * 2;
    if (this.y <= 0 || this.y + this.height >= height){
      this.moveDirection *= -1;
    }
  }
  
   collides(ball) {
    return (
      ball.x + ball.size / 2 > this.x &&
      ball.x - ball.size / 2 < this.x + this.width &&
      (ball.y - ball.size / 2 < this.y || ball.y + ball.size / 2 > this.y + this.height)
    );
  }
}

class HealthBoost {
  constructor(x, y, size) {
    this.x = x;               // Horizontal position
    this.y = y;               // Vertical position
    this.size = size;         // Size of the health boost item
    this.collected = false;   // Flag to track if it has been collected
  }

  // Draw the health boost item
  draw() {
    fill(50, 205, 50);        // Green color for visibility
    noStroke();
    ellipse(this.x, this.y, this.size);
  }

  // Move the health boost item to the left
  move() {
    this.x -= 3;              // Adjust speed as desired
  }

  // Check if the ball has collected the health boost
  checkCollection(ball) {
    // Check if the health boost is close enough to the ball to be "collected"
    if (dist(this.x, this.y, ball.x, ball.y) < (this.size + ball.size) / 2) {
      this.collected = true; // Mark as collected
      let healthIncrease = maxHealth * 0.8; // 80% of maxHealth
      ball.health = min(ball.health + healthIncrease, maxHealth); // Increase the ball's health, capped at maxHealth
      //console.log("Health boost collected. New health:", ball.health);
    }
  }
}

class BackgroundImage {
  constructor(easyImg, mediumImg, hardImg) {
    this.images = {
      easy: easyImg,
      medium: mediumImg,
      hard: hardImg
    };
    this.currentImage = null; // Holds the current image based on difficulty
    this.x = 0; // Scroll position
  }

  setImage(difficulty) {
    // Set the current image based on difficulty level
    this.currentImage = this.images[difficulty];
  }

  scroll(speed = 2) {
    // Move the background to the left by the specified speed
    this.x -= speed;
    if (this.x <= -width) {
      this.x = 0; // Reset position for seamless scroll
    }

    // Draw two copies of the image side-by-side for a seamless scroll effect
    image(this.currentImage, this.x, 0, width, height);
    image(this.currentImage, this.x + width, 0, width, height);
  }
}

/********* WEATHER EFFECTS *********/

function createRain() {
  for (let i = 0; i < 100; i++) {
    raindrops.push({ x: random(width), y: random(-height, 0), length: random(10, 20), speed: random(4, 10) });
  }
}

function drawRain() {
  if (raindrops.length === 0){
    return; // Skip if no raindrops
  }
  
  stroke(173, 216, 230, 150);
  strokeWeight(2);
  for (let drop of raindrops) {
    line(drop.x, drop.y, drop.x, drop.y + drop.length);
    drop.y += drop.speed;
    if (drop.y > height) {
      drop.y = random(-20, 0);
      drop.x = random(width);
    }
  }
}

function createWindParticles() {
  // Generate particles if the array is empty or needs more
  if (windParticles.length < 20) {
    windParticles.push({
      x: random(width),  // Random start position
      y: random(height), // Random vertical position
      speed: windForce * 5 + random(0.5, 1), // Wind speed based on windForce
      alpha: 255
    });
  }
}

function drawWindParticles() {
  noStroke();
  fill(173, 216, 230, 100); // Light blue with transparency

  // Update and draw each particle
  for (let i = windParticles.length - 1; i >= 0; i--) {
    let p = windParticles[i];
    p.x += p.speed; // Move horizontally based on wind direction

    // Draw the particle as a small ellipse or line
    ellipse(p.x, p.y, 4, 2); // Use small ellipses for subtle wind effect

    // Reduce alpha over time for fade-out effect
    p.alpha -= 2;
    
    // Remove particle if it moves off-screen or is fully faded
    if (p.x > width || p.x < 0 || p.alpha <= 0) {
      windParticles.splice(i, 1);
    }
  }
}

function updateWind() {
  // Change wind force and direction every `windChangeInterval` milliseconds
  if (millis() - lastWindChange > windChangeInterval) {
    windForce = random(-0.6, 0.6); // Adjust this range for desired wind strength
    lastWindChange = millis(); // Reset the timer
  }
}

function applyWindEffect(ball) {
  ball.speedHorizon += windForce; // Apply wind force to horizontal speed
}


/********* WEATHER MANAGEMENT *********/

function updateWeather() {
  // Change weather effect every `weatherChangeInterval` milliseconds
  if (millis() - weatherTimer > weatherChangeInterval) {
    const weatherOptions = ["wind", "wind", "none", "rain", "wind", "both"];
    currentWeather = random(weatherOptions); // Randomly select a weather effect
    weatherTimer = millis(); // Reset the timer
  }
}

/********* GAMEPLAY LOGIC *********/
function setDifficultySettings() {
  if (difficulty === "easy") {
    gapHeight = 300;
    wallSpeed = 3;
  } else if (difficulty === "medium") {
    gapHeight = 200;
    wallSpeed = 5;
  } else if (difficulty === "hard") {
    gapHeight = 150;
    wallSpeed = 7;
  }
}

function drawHealthBar() {
  noStroke();
  fill(189, 195, 199); // Background color of the health bar
  rectMode(CORNER);
  rect(20, 20, 100, 10); // Draw health bar background
  
  let currentHealth = constrain(ball.health, 0, maxHealth); // Ensure health is within bounds
  
  // Determine color based on health level
  if (ball.health > 60) {
    fill(46, 204, 113); // Green color for healthy
  } else if (ball.health > 30) {
    fill(230, 126, 34); // Orange color for medium health
  } else {
    fill(231, 76, 60); // Red color for low health
  }

  // Draw the filled portion of the health bar based on current health
  rect(20, 20, ball.health, 10);
}

function wallAdder() {
  if (millis() - lastWallTime > wallInterval) {
    let randY = round(random(0, height - gapHeight));
    let newWall = new Wall(width, randY, 80, gapHeight); // Create a new wall
    walls.push(newWall); // Add the new wall to the array
    lastWallTime = millis(); // Update the time of the last wall addition
    
    wallCounter++;
    
    // Add a health boost within the gap area at a 40% chance
    if (wallCounter >=5 && ball.health < 50 && difficulty !== "easy" && !healthBoost) {
      let boostX = width + 50; // Start off-screen to the right
      let boostY = randY + gapHeight / 2; // Position in the center of the wall gap
      let boostSize = 40; //Increase size to make it easier to collect
      healthBoost = new HealthBoost(boostX, boostY, boostSize); // Create a new health boost
      wallCounter = 0;
    }
  }
}


/********* PRELOAD IMAGES *********/
function preload() {
  easyImg = loadImage("Processing/Flappy_pong/In_GamePicture.jpg");
  mediumImg = loadImage("Processing/Flappy_pong/In_GamePicture2.jpg");
  hardImg = loadImage("Processing/Flappy_pong/In_GamePicture3.jpg");
  welcomeBackground = loadImage("Processing/Flappy_pong/HomeScreen.jpg");
  ScoreImage = loadImage("Processing/Flappy_pong/Score_picture.png");
  form_highScoreImg = loadImage("Processing/Flappy_pong/form_highscore.jpg");
  inGameFormImage = loadImage("Processing/Flappy_pong/In_GameForm.jpg");
  //console.log("Images loaded"); 
}

/********* SET UP *********/
function setup() {
  const canvas = createCanvas(500, 500);
  canvas.id("gameCanvas"); // Set a custom ID
  canvas.parent("gameContainer"); // Attach canvas to #gameContainer
  canvas.style.pointerEvents = "none"; // Prevent canvas from blocking inputs
  canvas.style.zIndex = "-1"; // Push canvas below the inputs

  backgroundImage = new BackgroundImage(easyImg, mediumImg, hardImg);
  ball = new Ball(width / 2, height / 2, 20, color(0));
  racket = new Racket(color(0), 100, 10);

  // Stop draw loop when interacting with inputs
  const usernameInput = document.getElementById("usernameInput");
  const pinInput = document.getElementById("pinInput");

  usernameInput?.addEventListener("focus", () => noLoop());
  pinInput?.addEventListener("focus", () => noLoop());

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#usernameInput") && !e.target.closest("#pinInput")) {
      loop(); // Resume draw loop when clicking outside inputs
    }
  });
}


/********* MAIN FUNCTIONS *********/
function updateGame() {
  // Weather updates (e.g., wind, rain) every 1 second
  if (frameCount % 60 === 0) { // Assuming 60 FPS
    updateWeather();
  }

  // Wall addition logic every 1 second
  if (frameCount % 60 === 0) {
    wallAdder();
  }

  // Health boost generation check every 1 second
  if (frameCount % 60 === 0 && ball.health < 50 && difficulty !== "easy" && !healthBoost) {
    let boostX = width + 50; // Start off-screen to the right
    let boostY = random(gapHeight, height - gapHeight); // Random Y position within a reasonable range
    let boostSize = 40; // Size of the health boost
    healthBoost = new HealthBoost(boostX, boostY, boostSize); // Create a new health boost instance
  }

  // Update wind particles for visual effects
  if (difficulty !== "easy" && frameCount % 5 === 0) {
    createWindParticles();
  }
}

function setupInputDebounce() {
  let inputDebounceTimer;

  document.addEventListener("keydown", (event) => {
    clearTimeout(inputDebounceTimer); // Reset timer
    inputDebounceTimer = setTimeout(() => {
      if (event.key === 'r'){
        resetGame();
      }
      else if (gameScreen === 3 && event.key === "Enter"){
        submitTopScore();
      }
    }, 50); // Only handle the input after 50ms
  });
}

function draw() {
  clear(); // Clear the canvas before rendering the next frame
  //console.log("Current gameScreen:", gameScreen); // Log the current gameScreen for debugging
  switch (gameScreen) {
    case 0:
      selectDifficulty();
      break;
    case 1:
      gameplayScreen();
      updateGame();
      break;
    case 2:
      gameOverScreen();
      break;
    case 3:
      topScoreEntryScreen();
      break;
    case 4:
      displayTopScoresScreen();
      noLoop();
      break;
    case 5:
      displayConnectionErrorScreen();
      break;
  }
}


function startGame() {
  gameScreen = 1;
  backgroundImage.setImage(difficulty);
  updateWeather();
  createRain();
}
/********* TOP FIVE SCORE - API INTEGRATION SCREENS & LOGIC *********/
function keyTyped() {
  if (gameScreen === 3) {
    if (activeField === "username" && /^[a-zA-Z0-9]$/.test(key) && playerName.length < 15) {
      playerName += key;
    } else if (activeField === "pin" && /^[0-9]$/.test(key) && playerPin.length < 6) {
      playerPin += key;
    }
  }
}

function displayErrorMessages() {
  const usernameErrorDiv = document.getElementById("usernameError");
  const pinErrorDiv = document.getElementById("pinError");

  // Username Error
  if (usernameError) {
    usernameErrorDiv.textContent = usernameError;
  } else {
    usernameErrorDiv.textContent = ""; // Clear error if no issue
  }

  // PIN Error
  if (pinError) {
    pinErrorDiv.textContent = pinError;
  } else {
    pinErrorDiv.textContent = ""; // Clear error if no issue
  }
}


function validateInputs() {
  let valid = true;

  // Username Validation
  const usernameErrorDiv = document.getElementById("usernameError");
  if (usernameErrorDiv) {
    if (!/^[a-zA-Z0-9]{8,15}$/.test(playerName)) {
      usernameErrorDiv.textContent = "Username must be 8–15 alphanumeric characters.";
      valid = false;
    } else {
      usernameErrorDiv.textContent = ""; // Clear error
    }
  }

  // PIN Validation
  const pinErrorDiv = document.getElementById("pinError");
  if (pinErrorDiv) {
    if (!/^\d{6}$/.test(playerPin) || ["123456", "000000", "111111"].includes(playerPin)) {
      pinErrorDiv.textContent = "PIN must be 6 digits and not '123456', '000000', or '111111'.";
      valid = false;
    } else {
      pinErrorDiv.textContent = ""; // Clear error
    }
  }

  return valid;
}


function removeInputFields() {
  const gameContainer = document.getElementById("gameContainer");
  const usernameInput = gameContainer.querySelector("#usernameInput");
  const pinInput = gameContainer.querySelector("#pinInput");

  // Remove input fields
  if (usernameInput){
    usernameInput.remove();
  }
  if (pinInput){
    pinInput.remove();
  }
  // Remove error messages
  const existingErrors = gameContainer.querySelectorAll(".error-message");
  existingErrors.forEach((error) => error.remove());
}


async function submitTopScore() {
  if (!validateInputs()) {
    //console.error("Input validation failed.");
    return; // Do not proceed if inputs are invalid
  }

  const url = "https://api-project-3abl.onrender.com/api/scores";
  const data = { username: playerName, pin: playerPin, score, difficulty_level: difficulty };

  //console.log("Submitting Score Data:", data);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    //console.log("Response Data:", responseData);

    if (response.status >= 400) {
      usernameError = responseData.details || responseData.message;
      //console.error("Submission error:", responseData);
      return;
    }

    // Score submitted successfully
    //console.log("Score submitted successfully. Transitioning to Top Scores screen.");
    removeInputFields(); // Remove the input fields
    fetchTopScores(difficulty, score) // Ensure scores are fetched after submission
      .then(() => {
        gameScreen = 4; // Transition to the Top Scores screen
        loop(); // Ensure the draw loop is active
      })
      .catch((error) => {
        //console.error("Error fetching top scores after submission:", error);
        gameScreen = 5; // Transition to an error screen if fetch fails
      });
  } catch (error) {
    //console.error("Error submitting score:", error);
    usernameError = "Unable to save your score. Please check your connection.";
    gameScreen = 5; // Transition to connection error screen
  }
}

function topScoreEntryScreen() {
  clear(); // Clear the canvas
  noLoop();
  setBodyBackground("Processing/Flappy_pong/In_GameForm.jpg"); // Set background
  removeDynamicElements(); // Clear any existing dynamic elements
  createInputForm(); // Add input form
}

function createInputForm() {
  const gameContainer = document.getElementById("gameContainer");

  // Clear existing elements in gameContainer
  gameContainer.innerHTML = "";

  // Create a form container
  const formContainer = document.createElement("div");
  formContainer.style.display = "flex";
  formContainer.style.flexDirection = "column";
  formContainer.style.alignItems = "center";
  formContainer.style.justifyContent = "center";
  formContainer.style.height = "100%";
  formContainer.style.width = "100%";
  formContainer.style.position = "absolute";
  formContainer.style.zIndex = "20"; // Ensure it is above the canvas
  formContainer.style.pointerEvents = "auto";

  // Add title
  const title = document.createElement("h1");
  title.textContent = "Congratulations! Top 5 Score!";
  title.style.color = "white";
  title.style.textShadow = "3px 3px 7px rgba(0, 0, 0, 0.9)"; // Stronger shadow
  title.style.fontWeight = "bold"; // Bold for emphasis
  title.style.textAlign = "center";
  title.style.fontSize = "36px"; // Increased font size
  title.style.marginBottom = "15px"; // Adjust spacing below
  title.style.marginTop = "-20px"; // Move the title slightly up
  formContainer.appendChild(title);

  // Add username input
  const usernameInput = document.createElement("input");
  usernameInput.id = "usernameInput";
  usernameInput.type = "text";
  usernameInput.placeholder = "Enter your username";
  usernameInput.style.color = "#000";
  usernameInput.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  usernameInput.style.boxShadow = "0 0 5px rgba(0, 0, 0, 0.5)";
  usernameInput.style.width = "80%";
  usernameInput.style.padding = "10px";
  usernameInput.style.marginBottom = "10px";
  usernameInput.style.border = "1px solid #ccc";
  usernameInput.style.borderRadius = "5px";
  usernameInput.style.fontSize = "16px";
  usernameInput.style.transition = "background-color 0.2s ease-in-out"; // Smooth hover effect
  formContainer.appendChild(usernameInput);

  // Add username error element
  const usernameError = document.createElement("div");
  usernameError.id = "usernameError";
  usernameError.style.color = "red";
  usernameError.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.7)";
  usernameError.style.fontWeight = "bold";
  usernameError.style.fontFamily = "Tahoma, Geneva, sans-serif"; // Font for error messages
  usernameError.style.textAlign = "center";
  usernameError.style.fontSize = "14px";
  usernameError.style.marginBottom = "10px";
  formContainer.appendChild(usernameError);

  // Add PIN input
  const pinInput = document.createElement("input");
  pinInput.id = "pinInput";
  pinInput.type = "password";
  pinInput.placeholder = "Enter your PIN";
  pinInput.style.color = "#000";
  pinInput.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  pinInput.style.boxShadow = "0 0 5px rgba(0, 0, 0, 0.5)";
  pinInput.style.width = "80%";
  pinInput.style.padding = "10px";
  pinInput.style.marginBottom = "10px";
  pinInput.style.border = "1px solid #ccc";
  pinInput.style.borderRadius = "5px";
  pinInput.style.fontSize = "16px";
  pinInput.style.transition = "background-color 0.2s ease-in-out"; // Smooth hover effect
  formContainer.appendChild(pinInput);

  // Add PIN error element
  const pinError = document.createElement("div");
  pinError.id = "pinError";
  pinError.style.color = "red";
  pinError.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.7)";
  pinError.style.fontWeight = "bold";
  pinError.style.fontFamily = "Tahoma, Geneva, sans-serif"; // Font for error messages
  pinError.style.textAlign = "center";
  pinError.style.fontSize = "14px";
  pinError.style.marginBottom = "20px";
  formContainer.appendChild(pinError);

  // Add reminder text
  const reminderText = document.createElement("p");
  reminderText.innerHTML =
    "If you created a username and PIN before, please use them again.<br>" +
    "If you forgot, create a new username and PIN. Keep a record for future use.";
  reminderText.style.color = "yellow"; // Changed to yellow for visibility
  reminderText.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.5)";
  reminderText.style.fontWeight = "bold";
  reminderText.style.textAlign = "center";
  reminderText.style.fontSize = "14px";
  reminderText.style.marginTop = "10px";
  reminderText.style.lineHeight = "1.5";
  formContainer.appendChild(reminderText);

  // Add instructions for submitting
  const instructions = document.createElement("p");
  instructions.textContent = "Press Enter to submit.";
  instructions.style.color = "yellow";
  instructions.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.7)";
  instructions.style.fontWeight = "bold";
  instructions.style.textAlign = "center";
  instructions.style.fontSize = "16px";
  instructions.style.marginTop = "20px";
  formContainer.appendChild(instructions);

  // Append form container to game container
  gameContainer.appendChild(formContainer);

  // Event Listeners for inputs
  usernameInput.addEventListener("click", () => {
    usernameInput.style.backgroundColor = "rgba(220, 220, 255, 0.8)"; // Light blue on focus
    usernameInput.focus();
  });
  usernameInput.addEventListener("blur", () => {
    usernameInput.style.backgroundColor = "rgba(255, 255, 255, 0.8)"; // Revert on blur
  });

  pinInput.addEventListener("click", () => {
    pinInput.style.backgroundColor = "rgba(220, 220, 255, 0.8)"; // Light blue on focus
    pinInput.focus();
  });
  pinInput.addEventListener("blur", () => {
    pinInput.style.backgroundColor = "rgba(255, 255, 255, 0.8)"; // Revert on blur
  });

  usernameInput.addEventListener("input", (e) => {
    playerName = e.target.value.replace(/[^a-zA-Z0-9]/g, ""); // Sanitize input
    //console.log("Username updated:", playerName);
  });

  pinInput.addEventListener("input", (e) => {
    playerPin = e.target.value.replace(/[^0-9]/g, ""); // Sanitize input
    //console.log("PIN updated:", playerPin);
  });
}


function removeInputFields() {
  const gameContainer = document.getElementById("gameContainer");
  const usernameInput = gameContainer.querySelector("#usernameInput");
  const pinInput = gameContainer.querySelector("#pinInput");

  // Remove input fields
  if (usernameInput) usernameInput.remove();
  if (pinInput) pinInput.remove();

  // Remove error messages
  const existingErrors = gameContainer.querySelectorAll(".error-message");
  existingErrors.forEach((error) => error.remove());
}

function removeDynamicElements() {
  const gameContainer = document.getElementById("gameContainer");
  gameContainer.innerHTML = ""; // Clear all dynamic elements
}


function fetchTopScores(difficulty, playerScore) {
  const url = `https://api-project-3abl.onrender.com/api/scores/${difficulty}`;
  
  // If a previous fetch has already failed, return early
  if (fetchFailed) {
    //console.log("Skipping fetch due to previous failure.");
    return Promise.resolve(false);
  }
  
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      return response.json();
    })
    .then(responseData => {
      const { data } = responseData;

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }

      topScores = data;

      // Check if the score qualifies for the top 5
      if (topScores.length < 5 || playerScore > topScores[topScores.length - 1].score) {
        //console.log("Score qualifies for top five!");
        return true; // Indicates the score qualifies
      } else {
        //console.log("Score does NOT qualify for top five.");
        return false; // Indicates the score does not qualify
      }
    })
    .catch(error => {
      //console.error("Error fetching top scores:", error.message);
      fetchFailed = true;
      throw error; // Ensure error propagates to `gameOver`
    });
}

function setBodyBackground(imageUrl = "") {
  const gameContainer = document.getElementById("gameContainer");

  if (!gameContainer) {
    //console.error("Game container not found!");
    return;
  }

  if (gameContainer.style.backgroundImage !== `url(${imageUrl})`) {
    // Match the canvas dimensions
    const canvasWidth = 500; // Game canvas width
    const canvasHeight = 500; // Game canvas height
    
    // Set the background image for the game container
    gameContainer.style.backgroundImage = `url(${imageUrl})`;
    
    // Set dimensions for the game container
    gameContainer.style.width = `${canvasWidth}px`;
    gameContainer.style.height = `${canvasHeight}px`;
    gameContainer.style.overflow = "hidden"; // Prevent scrolling
    gameContainer.style.margin = "0 auto"; // Center the container horizontally
    gameContainer.style.padding = "0";
    gameContainer.style.position = "relative";
    
    gameContainer.style.backgroundSize = "cover"; // Ensure image fits exactly
    gameContainer.style.backgroundRepeat = "no-repeat"; // Prevent duplicates
    gameContainer.style.backgroundPosition = "center center"; // Center the image

  } else {
    // Reset the styles for gameContainer
    gameContainer.style.backgroundImage = "";
    gameContainer.style.width = "";
    gameContainer.style.height = "";
    gameContainer.style.overflow = "";
    gameContainer.style.margin = "";
    gameContainer.style.padding = "";
    gameContainer.style.position = "";
  }
}


function displayTopScoresScreen() {
  clear(); // Clear the canvas
  setBodyBackground("Processing/Flappy_pong/form_highscore.jpg"); // Set the background image

  // Title
  textAlign(CENTER, TOP);
  fill(255); // White text for the title
  textSize(32);
  textFont("Arial");
  textStyle(BOLD);
  text("Top 5 Scores", width / 2, 30);

  // Check if `topScores` is available
  if (!topScores || topScores.length === 0) {
    textSize(20);
    fill(255, 255, 0); // Yellow text
    textStyle(BOLD);
    text("No scores available.", width / 2, height / 2);
    return;
  }

  // Subtle background box for scores
  const rectWidth = 350; // Fixed width
  const rectHeight = topScores.length * 40 + 30; // Dynamic height
  const rectX = width / 2 - rectWidth / 2;
  const rectY = 80; // Position below the title
  fill(0, 0, 0, 80); // Black with light transparency
  noStroke(); // Remove border
  rect(rectX, rectY, rectWidth, rectHeight, 20); // Subtle rounded corners

  // Display scores
  textSize(20);
  fill(255, 255, 0); // Yellow text
  textFont("Arial");
  textStyle(BOLD);

  const startY = rectY + 15; // Starting y-coordinate
  const lineHeight = 40; // Space between score lines
  const rankX = rectX + 20; // Rank position
  const nameX = rectX + 60; // Username position
  const scoreX = rectX + rectWidth - 70; // Score position

  topScores.forEach((score, index) => {
    textAlign(LEFT);

    // Truncate long usernames
    const maxUsernameLength = 12;
    const displayUsername =
      score.username.length > maxUsernameLength
        ? score.username.substring(0, maxUsernameLength - 3) + "..."
        : score.username;

    // Render rank, username, and score
    text(`${index + 1}.`, rankX, startY + index * lineHeight); // Rank
    text(displayUsername, nameX, startY + index * lineHeight); // Username
    text(`${score.score}`, scoreX, startY + index * lineHeight); // Score
  });

  // Restart instructions
  textAlign(CENTER, CENTER);
  textSize(16);
  fill(255); // White text
  textFont("Arial");
  textStyle(BOLD);
  text("Press R to Restart", width / 2, height - 40);
}


function displayConnectionErrorScreen() {
  clear(); // Clear the canvas

  // Set the background (if applicable)
  setBodyBackground("Processing/Flappy_pong/Score_picture.png");

  textAlign(CENTER, CENTER);

  // Display the error message
  fill(255, 0, 0); // Red text for high visibility
  textSize(24);
  text("Connection Error", width / 2, height / 2 - 100);

  // Display the detailed error message
  fill(255); // White text
  textSize(16);
  text(usernameError, width / 2, height / 2 - 60);

  // Display the user's score
  fill(236, 240, 241); // Light gray text
  textSize(20);
  text(`Your Score: ${score}`, width / 2, height / 2);

  // Display reset instructions
  textSize(16);
  text("Press R to Return to the Main Menu", width / 2, height / 2 + 50);
}



/********* GAMEPLAY SCREEN *********/
function gameplayScreen() {
 if (gameOverTriggered) {
    return; // Stop further updates if the game is over
  }
  
  backgroundImage.scroll();
  updateWeather();

  ball.applyGravity(); // Apply gravity to the ball

  // Apply weather effects based on difficulty level
  if (difficulty === "hard") {
    ball.applyWeatherEffects(); // Apply all weather effects (rain, wind, both)

    // Visualize the current weather
    if (currentWeather === "rain" || currentWeather === "both") {
      drawRain();
    }

    if (currentWeather === "wind" || currentWeather === "both") {
      createWindParticles();
      drawWindParticles();
    }
  } 
  else if (difficulty === "medium") {
    // Only apply wind in medium difficulty
    if (currentWeather === "wind" || currentWeather === "both") {
      ball.applyWeatherEffects(); // Only wind effects are applied
      createWindParticles();
      drawWindParticles();
    }
  }

  wallAdder(); // Add walls periodically

   // Move and draw walls, and check for collisions
  for (let i = walls.length - 1; i >= 0; i--) {
    walls[i].move();
    walls[i].draw();

    // Check collision with the ball
    if (walls[i].collides(ball)) {
      ball.decreaseHealth(1.2);
    }
    
     // Increase score only if the wall hasn't been scored and ball has passed it
    if (!walls[i].scored && walls[i].x + walls[i].width < ball.x - ball.size / 2) {
      score++;
      walls[i].scored = true; // Mark wall as scored
    }

    // Remove the wall if it's out of bounds
    if (walls[i].x + walls[i].width < 0) {
      walls.splice(i, 1);
    }
  }
  

  if (healthBoost) {
    healthBoost.move();
    healthBoost.draw();
    healthBoost.checkCollection(ball);

    // Log each frame to confirm it’s being processed
    //console.log("Health boost is at:", healthBoost.x, healthBoost.y);

    // Remove the item if it's collected or off-screen
    if (healthBoost.collected || healthBoost.x + healthBoost.size < 0) {
      //console.log("Health boost collected or off-screen");
      healthBoost = null;  // Reset health boost so it can reappear if needed
    }
  }

  racket.draw();
  racket.watchBounce(ball);
  ball.draw();
  ball.keepInScreen();
  drawHealthBar();
  
  // Display score at the top of the screen
  fill(255);
  textSize(20);
  text("Score: " + score, width - 100, 30);
}

function selectDifficulty() {
  imageMode(CORNER);
  image(welcomeBackground, 0, 0, width, height);

  textAlign(CENTER, CENTER);

  // Shadow for "Welcome to Flappy Pong"
  fill(0, 0, 0, 150); // Semi-transparent black shadow
  textSize(36);
  text("Welcome to Flappy Pong", width / 2 + 2, height / 2 - 200 + 2); // Shifted up 50px from previous

  // Main text for "Welcome to Flappy Pong"
  fill(255, 255, 204); // Light yellow for visibility on mountain background
  text("Welcome to Flappy Pong", width / 2, height / 2 - 200);


  // Main text for "Select Difficulty level:"
  textSize(24);
  fill(255, 255, 204); // Light yellow
  textStyle(BOLD);
  text("Select Difficulty level:", width / 2, height / 2 - 100);

  // Text options for difficulty levels
  textSize(20);
  textStyle(NORMAL);

  // Shadow and main text for difficulty levels
  fill(0, 0, 0, 150);
  text("Press 1 for Easy", width / 2 + 1, height / 2 - 50 + 1); // Shifted up 50px
  text("Press 2 for Medium", width / 2 + 1, height / 2 - 10 + 1); // Shifted up 50px
  text("Press 3 for Hard", width / 2 + 1, height / 2 + 30 + 1); // Shifted up 50px

  fill(255, 255, 204); // Light yellow for main text
  text("Press 1 for Easy", width / 2, height / 2 - 50);
  text("Press 2 for Medium", width / 2, height / 2 - 10);
  text("Press 3 for Hard", width / 2, height / 2 + 30);
}

async function gameOver() {

  try {

    // Attempt to fetch top scores
    const qualifies = await fetchTopScores(difficulty, score);

    if (qualifies) {
      //console.log("Score qualifies for top five! Redirecting to Top Score Entry Screen...");
      gameScreen = 3; // Move to the top-score entry screen
    } 
    else {
      //console.log("Score does NOT qualify. Staying on Game Over Screen...");
      gameScreen = 2; // Stay on the regular game-over screen
    }
  } 
  catch (error) {
    //console.error("Error during gameOver:", error);
    fetchFailed = true; // Mark the fetch as failed
    usernameError = "Unable to fetch top scores. Please check your connection.";
    gameScreen = 5; // Transition to connection error screen
  }
  finally{
    gameOverTriggered = true; // Set the flag to prevent further calls
  }
}


function gameOverScreen() {
  clear();
  removeInputFields(); // Remove any lingering input fields from the previous screen
  
  imageMode(CORNER);
  image(ScoreImage, 0, 0, width, height);
  textAlign(CENTER);
  fill(236, 240, 241);
  
  textSize(50);
  text("Game Over", width / 2, height / 2 - 125); // Moved up by 25 more pixels

  textSize(20);
  text("Your Score: " + score, width / 2, height / 2 - 60); // Display the user's score
  text("Press r to Restart", width / 2, height / 2 - 25); // Restart instruction

  // New instruction for viewing top scores
  text("Press t to View Top Scores", width / 2, height / 2 + 15);
}

function keyPressed() {
  if (gameScreen === 0) {
    if (key === '1') {
      difficulty = "easy";
    } 
    else if (key === '2') {
      difficulty = "medium";
    } 
    else if (key === '3') {
      difficulty = "hard";
    }
    setDifficultySettings();
    startGame();
  } 
  else if ((gameScreen === 2 || gameScreen === 4 || gameScreen === 5) && key === 'r') {
    clear();
    resetGame(); // Restart on 'R' press in game over screen
    loop();
  } 
  else if (gameScreen === 3 && keyCode === ENTER) {
    submitTopScore(); // Submit top score
  } 
  else if (gameScreen === 2 && key === 't') { // View top scores
    fetchTopScores(difficulty, 0) // Fetch top scores for the current difficulty
      .then(() => {
        gameScreen = 4; // Switch to the Top Scores screen
      })
      .catch((error) => {
        //console.error("Error fetching top scores:", error);
      });
  }
}


function resetGame() {
  score = 0;
  ball.health = maxHealth; // Reset health only
  ball.x = width / 2; // Center the ball horizontally
  ball.y = height / 2; // Center the ball vertically
  ball.speedVert = 0; // Reset vertical speed
  ball.speedHorizon = 0; //Reset horizontal speed
  gameScreen = 0;
  walls = []; // Clear walls for a fresh start
  wallCounter = 0;
  fetchFailed = false; // Reset the fetch failure flag
  gameOverTriggered = false; // Reset game over trigger
  removeInputFields();
  setBodyBackground("");
}