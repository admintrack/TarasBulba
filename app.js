/* Taras Bulba — Split board: Deck (flip) + Last Card (reference) */

let deck = [];
let currentCard = null; // active reference number
let remainingEl, statusEl, deckCardEl, deckFront, deckBack, lastCardEl, lastTextEl, loseOverlay, loseMsg;
let isRevealing = false;

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

// Ensure first revealed reference is a number
function dealFirstNumber() {
  let safety = 100;
  while (deck.length && typeof deck[deck.length - 1] !== "number" && safety--) {
    deck.unshift(deck.pop());
  }
  currentCard = deck.pop(); // number
  drawReference(currentCard);
  setStatus("Guess Higher, Lower, or Blank");
}

function newRound() {
  deck = shuffle(buildDeck());
  dealFirstNumber();
  updateRemaining();
  resetDeckFace();
  hideLoseScreen();
}

function setStatus(msg){ statusEl.textContent = msg; }
function updateRemaining(){ remainingEl.textContent = `Deck: ${deck.length}`; }

function drawReference(v){
  lastTextEl.textContent = String(v);
  // subtle flash on reference card by re-using classes
  lastCardEl.classList.remove("flash-good","flash-bad","flash-special");
  void lastCardEl.offsetWidth;
  lastCardEl.classList.add("flash-special");
  setTimeout(()=> lastCardEl.classList.remove("flash-special"), 220);
  const hint = document.getElementById("refHint");
  hint.textContent = `Compare against: ${v}`;
}

function resetDeckFace(){
  deckFront.textContent = "?";
  deckBack.textContent = "?";
}

function haptic(ms=15){ if (navigator.vibrate) navigator.vibrate(ms); }
function flashDeck(kind){
  deckCardEl.classList.remove("flash-good","flash-bad","flash-special");
  void deckCardEl.offsetWidth;
  deckCardEl.classList.add(kind);
  setTimeout(()=>deckCardEl.classList.remove(kind), 250);
}

function disableButtons(disabled){
  ["btnHigher","btnLower","btnBlank","newGame"].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (disabled) el.classList.add("disabled"); else el.classList.remove("disabled");
  });
}

function revealNext(guess){
  if (isRevealing) return;
  if (!deck.length){
    setStatus("Deck exhausted — reshuffling…");
    haptic(20);
    newRound();
    return;
  }

  isRevealing = true;
  disableButtons(true);
  setStatus("Turning…");
  deckCardEl.classList.add("flipping");
  haptic(8);

  const next = deck.pop();
  updateRemaining();

  const strictBlankLoss = (guess === "blank" && next !== "Blank");

  setTimeout(()=> {
    deckBack.textContent = (typeof next === "number") ? String(next) : next;

    setTimeout(()=> {
      deckCardEl.classList.remove("flipping");

      if (strictBlankLoss){
        flashDeck("flash-bad");
        haptic(30);
        setStatus("Wrong guess — you called Blank.");
        showLoseScreen(next);
        isRevealing = false; disableButtons(false);
        return;
      }

      if (typeof next === "number"){
        const correct =
          (guess === "higher" && next > currentCard) ||
          (guess === "lower"  && next < currentCard);

        if (correct){
          flashDeck("flash-good");
          haptic(10);
          currentCard = next;
          drawReference(currentCard);   // update right panel
          setStatus("Nice! Keep going.");
        } else {
          flashDeck("flash-bad");
          haptic(30);
          setStatus("Wrong guess.");
          showLoseScreen(next);
        }
      } else {
        if (next === "Blank"){
          flashDeck("flash-good");
          haptic(12);
          // reference stays the same number
          setStatus("Correct: Blank! Previous number stays.");
        } else {
          // Skip / Pass / Reverse
          flashDeck("flash-special");
          haptic(8);
          setStatus(`${next}! Previous number (${currentCard}) stays — guess again.`);
        }
      }

      // After reveal, reset deck front to '?' ready for next turn
      resetDeckFace();

      isRevealing = false;
      disableButtons(false);
    }, 60);
  }, 2000);
}

/* Lose Screen */
function showLoseScreen(revealed){
  if (!loseOverlay) return;
  loseMsg.textContent = `You revealed ${revealed}.`;
  loseOverlay.classList.remove("hidden");
}
function hideLoseScreen(){
  if (loseOverlay) loseOverlay.classList.add("hidden");
}

/* SW update helpers */
async function initServiceWorker(){
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.register("./sw.js");
  try { await reg.update(); } catch {}
  navigator.serviceWorker.addEventListener("controllerchange", () => { window.location.reload(); });
}

/* Wiring */
window.addEventListener("load", () => {
  deckCardEl = document.getElementById("deckCard");
  deckFront   = document.getElementById("deckFront");
  deckBack    = document.getElementById("deckBack");
  lastCardEl  = document.getElementById("lastCard");
  lastTextEl  = document.getElementById("lastText");
  statusEl    = document.getElementById("status");
  remainingEl = document.getElementById("remaining");
  loseOverlay = document.getElementById("loseOverlay");
  loseMsg     = document.getElementById("loseMsg");

  document.getElementById("btnHigher").addEventListener("click", ()=> revealNext("higher"));
  document.getElementById("btnLower").addEventListener("click",  ()=> revealNext("lower"));
  document.getElementById("btnBlank").addEventListener("click",  ()=> revealNext("blank"));
  document.getElementById("newGame").addEventListener("click",   ()=> { haptic(8); newRound(); });
  document.getElementById("restartBtn").addEventListener("click",()=> { hideLoseScreen(); newRound(); });

  newRound();
  initServiceWorker();

  // PWA install prompt
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e; installBtn.hidden = false;
  });
  installBtn?.addEventListener("click", async () => {
    installBtn.hidden = true;
    deferredPrompt?.prompt();
    await deferredPrompt?.userChoice;
    deferredPrompt = null;
  });
});