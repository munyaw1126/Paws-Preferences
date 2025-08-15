const catContainer = document.getElementById("cat-container");
const summarySection = document.getElementById("summary");
const likeCountEl = document.getElementById("like-count");
const likedCatsContainer = document.getElementById("liked-cats");
const undoBtn = document.getElementById("undo-btn"); // new

let historyStack = []; // store {index, url, action}
let cats = [];
let likedCats = [];
let currentIndex = 0;
let startX = 0;
let currentCard = null;
let isDragging = false;
let swipeThreshold = window.innerWidth < 768 ? 100 : 80; // mobile vs desktop sensitivity

// Show intro only if first visit
if (!localStorage.getItem("seenIntro")) {
  document.getElementById("intro-overlay").style.display = "flex";
}

document.getElementById("got-it-btn").addEventListener("click", () => {
  document.getElementById("intro-overlay").style.display = "none";
  localStorage.setItem("seenIntro", "true");
});



// Event for undo button
undoBtn.addEventListener("click", undoLastLike);

async function loadCats() {
  cat = [];// make sure array is fresh each time
  let promises = [];
  for (let i = 0; i < 10; i++) {
    let url = `https://cataas.com/cat?random=${Math.random()}`;
    cats.push(url);
    promises.push(preloadImage(url));
  }
  await Promise.all(promises);
  renderStack();
}

function preloadImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.src = url;
    img.onload = resolve;
  });
}

function renderStack() {
  catContainer.innerHTML = "";

  for (let i = currentIndex; i < Math.min(cats.length, currentIndex + 3); i++) {
    const catCard = document.createElement("div");
    catCard.className = "cat-card";
    catCard.style.backgroundImage = `url(${cats[i]})`;
    catCard.style.zIndex = cats.length - i;

    const likeBadge = document.createElement("div");
    likeBadge.className = "badge like-badge";
    likeBadge.textContent = "LIKE ❤️";

    const dislikeBadge = document.createElement("div");
    dislikeBadge.className = "badge dislike-badge";
    dislikeBadge.textContent = "NOPE ❌";

    catCard.appendChild(likeBadge);
    catCard.appendChild(dislikeBadge);

    if (i === currentIndex) attachSwipeEvents(catCard);

    catContainer.appendChild(catCard);
  }

  // Show undo button only if there is history
  undoBtn.style.display = historyStack.length > 0 ? "block" : "none";
}

function attachSwipeEvents(card) {
  card.onmousedown = null;
  card.onmousemove = null;
  card.onmouseup = null;
  card.ontouchstart = null;
  card.ontouchmove = null;
  card.ontouchend = null;

  card.addEventListener("mousedown", startDrag);
  card.addEventListener("mousemove", dragMove);
  card.addEventListener("mouseup", endDrag);
  card.addEventListener("touchstart", startDrag);
  card.addEventListener("touchmove", dragMove);
  card.addEventListener("touchend", endDrag);
}

function startDrag(e) {
  startX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
  currentCard = e.currentTarget;
  isDragging = true;
  currentCard.style.transition = "none";
}

function dragMove(e) {
  if (!isDragging) return;
  const x = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
  const diffX = x - startX;
  const rotation = diffX / 20;
  currentCard.style.transform = `translateX(${diffX}px) rotate(${rotation}deg)`;

  const likeBadge = currentCard.querySelector(".like-badge");
  const dislikeBadge = currentCard.querySelector(".dislike-badge");

  if (diffX > 0) {
    likeBadge.style.opacity = Math.min(diffX / 100, 1);
    dislikeBadge.style.opacity = 0;
  } else {
    dislikeBadge.style.opacity = Math.min(-diffX / 100, 1);
    likeBadge.style.opacity = 0;
  }
}

function endDrag(e) {
  if (!isDragging) return;
  isDragging = false;
  const endX = e.type.includes("mouse") ? e.clientX : e.changedTouches[0].clientX;
  const diffX = endX - startX;

  if (diffX > swipeThreshold) handleLike();
  else if (diffX < -swipeThreshold) handleDislike();
  else resetCardPosition();
}

function resetCardPosition() {
  currentCard.style.transition = "transform 0.3s ease";
  currentCard.style.transform = "translateX(0) rotate(0deg)";
  currentCard.querySelector(".like-badge").style.opacity = 0;
  currentCard.querySelector(".dislike-badge").style.opacity = 0;
}

function handleLike() {
  likedCats.push(cats[currentIndex]);
  historyStack.push({ index: currentIndex, url: cats[currentIndex], action: "like" });
  animateCard("right");
}

function handleDislike() {
  historyStack.push({ index: currentIndex, url: cats[currentIndex], action: "dislike" });
  animateCard("left");
}

function animateCard(direction) {
  const moveX = direction === "right" ? window.innerWidth : -window.innerWidth;
  currentCard.style.transition = "transform 0.4s ease";
  currentCard.style.transform = `translateX(${moveX}px) rotate(${direction === "right" ? 20 : -20}deg)`;

  setTimeout(() => {
    currentIndex++;
    if (currentIndex >= cats.length) showSummary();
    else renderStack();
  }, 400);
}

function undoLastLike() {
  if (historyStack.length === 0) return;

  const lastAction = historyStack.pop();

  // Remove from likedCats if last action was like
  if (lastAction.action === "like") {
    likedCats = likedCats.filter(url => url !== lastAction.url);
  }

  // Rewind the current index
  currentIndex = lastAction.index;

  // Create a card for the undone cat
  const catCard = document.createElement("div");
  catCard.className = "cat-card";
  catCard.style.backgroundImage = `url(${cats[currentIndex]})`;
  catCard.style.zIndex = cats.length - currentIndex;

  const likeBadge = document.createElement("div");
  likeBadge.className = "badge like-badge";
  likeBadge.textContent = "LIKE ❤️";
  likeBadge.style.opacity = lastAction.action === "like" ? 1 : 0;

  const dislikeBadge = document.createElement("div");
  dislikeBadge.className = "badge dislike-badge";
  dislikeBadge.textContent = "NOPE ❌";
  dislikeBadge.style.opacity = lastAction.action === "dislike" ? 1 : 0;

  catCard.appendChild(likeBadge);
  catCard.appendChild(dislikeBadge);
  catContainer.appendChild(catCard);

  // Animate card flowing back from left or right
  catCard.style.transition = "none";
  catCard.style.transform = lastAction.action === "like" ? 
                            `translateX(${window.innerWidth}px) rotate(20deg)` :
                            `translateX(${-window.innerWidth}px) rotate(-20deg)`;

  requestAnimationFrame(() => {
    // Animate to center
    catCard.style.transition = "transform 0.5s ease";
    catCard.style.transform = "translateX(0) rotate(0deg)";
  });

  // Make it swipeable again
  attachSwipeEvents(catCard);

  // Show undo button if there are more history
  undoBtn.style.display = historyStack.length > 0 ? "block" : "none";
}

function showSummary() {
  catContainer.style.display = "none";
  undoBtn.style.display = "none"; // hide undo button at summary
  summarySection.style.display = "block";

  likeCountEl.textContent = likedCats.length;
  likedCatsContainer.innerHTML = "";

  if (likedCats.length === 0) {
    likeCountEl.textContent = 0;
    
    // Show sad cat and message
    likedCatsContainer.innerHTML = `
      <div style="text-align:center;">
        <img src="https://media.giphy.com/media/8vQSQ3cNXuDGo/giphy.gif" 
             alt="Sad cat" 
             style="width:200px; border-radius:8px; margin-bottom:10px;">
        <p style="font-size:18px; color:#555;">You are not a cat lover 😿</p>
      </div>
    `;
  } else {
    likeCountEl.textContent = likedCats.length;
    likedCats.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      likedCatsContainer.appendChild(img);
    });
  }
}
const swipeAgainBtn = document.getElementById("swipe-again-btn");

swipeAgainBtn.addEventListener("click", async() => {
  // Reset data
  cats = [];
  likedCats = [];
  historyStack = [];
  currentIndex = 0;

  // Reset UI
  likedCatsContainer.innerHTML = "";
  summarySection.style.display = "none";
  catContainer.style.display = "block";
  undoBtn.style.display = "none";
  //catContainer.innerHTML = "Loading..."; // Temporary message

  // Show loader
  document.getElementById("loading-screen").style.display = "block";
  
  // Reload cats fresh
  await loadCats();

  // Hide loader and show swipe area
  document.getElementById("loading-screen").style.display = "none";
  catContainer.style.display = "block";
});

// Modal functionality
const modal = document.getElementById("modal");
const modalImg = modal.querySelector("img");

likedCatsContainer.addEventListener("click", (e) => {
  if (e.target.tagName === "IMG") {
    modalImg.src = e.target.src;
    modal.style.display = "flex";
  }
});

modal.addEventListener("click", () => {
  modal.style.display = "none";
});

loadCats();
