/* Taras Bulba — PWA + Single-Player Game with Flip + Strict Blank Rule */

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
  // update both faces so it looks correct before/after flip
  const txt = (typeof v === "number") ? String(v) : v;
  cardFront.textContent = txt;
  // back face shows "?" until next reveal
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
  if (isRevealing) return; // don't double-trigger
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

  // Strict Blank rule: if player called "blank" and the next is anything except "Blank" → lose.
  const strictBlankLoss = (guess === "blank" && next !== "Blank");

  // Wait 2s to simulate turning the card
  setTimeout(()=> {
    // Flip complete, reveal result
    const showText = (typeof next === "number") ? String(next) : next;
    cardBack.textContent = showText; // the flipped side will now show the revealed card

    // Small delay to ensure it visually settles before evaluation styles
    setTimeout(()=> {
      cardEl.classList.remove("flipping");

      if (strictBlankLoss) {
        // Reveal then lose
        flash("flash-bad");
        haptic(30);
        setStatus("Wrong guess — you called Blank.");
        showLoseScreen(next);
        isRevealing = false;
        disableButtons(false);
        return;
      }

      if (typeof next === "number") {
        // Evaluate higher/lower
        const correct =
          (guess === "higher" && next > currentCard) ||
          (guess === "lower"  && next < currentCard);

        if (correct) {
          flash("flash-good");
          haptic(10);
          currentCard = next;
          // sync front face to revealed after flip
          drawCardFace(currentCard);
          setStatus("Nice! Keep going.");
        } else {
          flash("flash-bad");
          haptic(30);
          setStatus("Wrong guess.");
          showLoseScreen(next);
        }
      } else {
        // Special card
        if (next === "Blank") {
          // Only correct if guessed Blank (strictBlankLoss already handled)
          flash("flash-good");
          haptic(12);
          // previous number stays active
          drawCardFace("Blank");
          setStatus("Correct: Blank! Previous number stays.");
        } else {
          // Skip / Pass / Reverse → no penalty; previous number stays
          flash("flash-special");
          haptic(8);
          drawCardFace(next);
          setStatus(`${next}! Previous number (${currentCard}) stays — guess again.`);
        }
      }

      // Resync front face to whatever is showing now
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