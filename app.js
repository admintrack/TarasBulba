/* Taras Bulba — Minimal PWA + Single-Player Game Logic */

let deck = [];
let currentCard = null;      // last numbered card in play
let remainingEl, statusEl, cardEl, loseOverlay, loseMsg;

const SPECIALS = ["Blank", "Skip", "Skip", "Pass", "Pass", "Reverse", "Reverse"];

function buildDeck() {
  const numbers = Array.from({ length: 14 }, (_, i) => i + 1);
  return [...numbers, ...SPECIALS];
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ensure the first visible card is a NUMBER (not a special)
function dealFirstNumber() {
  let safety = 100;
  while (deck.length && typeof deck[deck.length - 1] !== "number" && safety--) {
    deck.unshift(deck.pop());
  }
  currentCard = deck.pop(); // number
  drawCardFace(currentCard);
  setStatus("Guess Higher, Lower, or Blank");
}

function newRound() {
  deck = shuffle(buildDeck());
  dealFirstNumber();
  updateRemaining();
  hideLoseScreen();
}

function setStatus(msg) { statusEl.textContent = msg; }
function updateRemaining() { remainingEl.textContent = `Deck: ${deck.length}`; }

function drawCardFace(v) {
  cardEl.textContent = (typeof v === "number") ? v : v; // shows special text as-is
}

function haptic(ms = 15){ if (navigator.vibrate) navigator.vibrate(ms); }
function flash(kind){
  cardEl.classList.remove("flash-good","flash-bad","flash-special");
  void cardEl.offsetWidth; // reflow to restart animation
  cardEl.classList.add(kind);
  setTimeout(()=>cardEl.classList.remove(kind), 220);
}

function revealNext(guess){
  if (!deck.length) {
    setStatus("Deck exhausted — reshuffling…");
    haptic(20);
    newRound();
    return;
  }

  const next = deck.pop();
  updateRemaining();

  if (typeof next === "number") {
    if (guess === "blank") {
      lose(next);
      return;
    }
    const correct =
      (guess === "higher" && next > currentCard) ||
      (guess === "lower"  && next < currentCard);

    drawCardFace(next);
    if (correct) {
      flash("flash-good");
      haptic(10);
      currentCard = next;
      setStatus("Nice! Keep going.");
    } else {
      lose(next);
    }
  } else {
    // Special card: Blank / Skip / Pass / Reverse
    if (next === "Blank") {
      if (guess === "blank") {
        drawCardFace("Blank");
        flash("flash-good");
        haptic(12);
        setStatus("Correct: Blank! Previous number stays.");
      } else {
        lose("Blank");
        return;
      }
    } else {
      // Skip / Pass / Reverse → no penalty, previous number stays
      drawCardFace(next);
      flash("flash-special");
      haptic(8);
      setStatus(`${next}! Previous number (${currentCard}) stays — guess again.`);
    }
  }
}

function lose(revealed){
  drawCardFace(revealed);
  flash("flash-bad");
  haptic(30);
  setStatus("Wrong guess — game over.");
  showLoseScreen(revealed);
}

/* Lose screen helpers */
function showLoseScreen(revealed){
  if (loseOverlay) {
    loseMsg.textContent = `You revealed ${revealed}.`;
    loseOverlay.classList.remove("hidden");
  }
}
function hideLoseScreen(){
  if (loseOverlay) loseOverlay.classList.add("hidden");
}

// UI wiring
window.addEventListener("load", () => {
  cardEl = document.getElementById("card");
  statusEl = document.getElementById("status");
  remainingEl = document.getElementById("remaining");
  loseOverlay = document.getElementById("loseOverlay");
  loseMsg = document.getElementById("loseMsg");

  document.getElementById("btnHigher").addEventListener("click", ()=> revealNext("higher"));
  document.getElementById("btnLower").addEventListener("click",  ()=> revealNext("lower"));
  document.getElementById("btnBlank").addEventListener("click",  ()=> revealNext("blank"));
  document.getElementById("newGame").addEventListener("click",   ()=> { haptic(8); newRound(); });
  document.getElementById("restartBtn").addEventListener("click", ()=> { hideLoseScreen(); newRound(); });

  // Start the game
  newRound();

  // PWA: register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }

  // Lightweight custom install prompt
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn?.addEventListener("click", async () => {
    installBtn.hidden = true;
    deferredPrompt?.prompt();
    await deferredPrompt?.userChoice;
    deferredPrompt = null;
  });
});