/* Taras Bulba — PWA + Single-Player Game with Flip + Strict Blank Rule + Update-aware */

let deck = [];
let currentCard = null;      // last numbered card in play
let remainingEl, statusEl, cardEl, loseOverlay, loseMsg, cardFront, cardBack;
let isRevealing = false;     // prevent multiple clicks during flip

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
  const txt = (typeof v === "number") ? String(v) : v;
  cardFront.textContent = txt;
  cardBack.textContent = "?";
}

function haptic(ms = 15){ if (navigator.vibrate) navigator.vibrate(ms); }
function flash(kind){
  cardEl.classList.remove("flash-good","flash-bad","flash-special");
  void cardEl.offsetWidth; // reflow to restart animation
  cardEl.classList.add(kind);
  setTimeout(()=>cardEl.classList.remove(kind), 250);
}

function disableButtons(disabled) {
  ["btnHigher","btnLower","btnBlank","newGame"].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (disabled) el.classList.add("disabled");
    else el.classList.remove("disabled");
  });
}

function revealNext(guess){
  if (isRevealing) return;
  if (!deck.length) {
    setStatus("Deck exhausted — reshuffling…");
    haptic(20);
    newRound();
    return;
  }

  isRevealing = true;
  disableButtons(true);
  setStatus("Turning…");
  cardEl.classList.add("flipping");
  haptic(8);

  const next = deck.pop();
  updateRemaining();

  // Strict: calling blank and it isn't blank → loss (even if special)
  const strictBlankLoss = (guess === "blank" && next !== "Blank");

  setTimeout(()=> {
    const showText = (typeof next === "number") ? String(next) : next;
    cardBack.textContent = showText;

    setTimeout(()=> {
      cardEl.classList.remove("flipping");

      if (strictBlankLoss) {
        flash("flash-bad");
        haptic(30);
        setStatus("Wrong guess — you called Blank.");
        showLoseScreen(next);
        isRevealing = false;
        disableButtons(false);
        return;
      }

      if (typeof next === "number") {
        const correct =
          (guess === "higher" && next > currentCard) ||
          (guess === "lower"  && next < currentCard);

        if (correct) {
          flash("flash-good");
          haptic(10);
          currentCard = next;
          drawCardFace(currentCard);
          setStatus("Nice! Keep going.");
        } else {
          flash("flash-bad");
          haptic(30);
          setStatus("Wrong guess.");
          showLoseScreen(next);
        }
      } else {
        if (next === "Blank") {
          flash("flash-good");
          haptic(12);
          drawCardFace("Blank");
          setStatus("Correct: Blank! Previous number stays.");
        } else {
          flash("flash-special");
          haptic(8);
          drawCardFace(next);
          setStatus(`${next}! Previous number (${currentCard}) stays — guess again.`);
        }
      }

      cardFront.textContent = cardBack.textContent;

      isRevealing = false;
      disableButtons(false);
    }, 60);
  }, 2000);
}

function showLoseScreen(revealed){
  if (!loseOverlay) return;
  loseMsg.textContent = `You revealed ${revealed}.`;
  loseOverlay.classList.remove("hidden");
}
function hideLoseScreen(){
  if (loseOverlay) loseOverlay.classList.add("hidden");
}

// --- PWA update helpers ---
async function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.register("./sw.js");
  // Proactively check for an update on every load
  try { await reg.update(); } catch {}

  // Auto-reload when the new SW takes control
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

// UI wiring
window.addEventListener("load", () => {
  cardEl = document.getElementById("card");
  cardFront = document.getElementById("cardFront");
  cardBack = document.getElementById("cardBack");
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

  // PWA: register/update service worker and auto-reload on new version
  initServiceWorker();

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