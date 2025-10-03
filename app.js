/* Taras Bulba — Deck slides over Last Card, then flips (3s). Strict blank rule. Clearer specials. */
/* Uses Web Animations API for the slide to ensure it actually moves cross-browser. */

let deck = [];
let currentCard = null; // active reference number
let remainingEl, statusEl, deckCardEl, deckFront, deckBack, lastCardEl, lastTextEl, loseOverlay, loseMsg;
let isRevealing = false;

const SPECIALS = ["Blank", "Skip", "Skip", "Pass", "Pass", "Reverse", "Reverse"];

function buildDeck(){ return [...Array.from({length:14},(_,i)=>i+1), ...SPECIALS]; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

// Ensure first revealed reference is a number
function dealFirstNumber(){
  let safety=100;
  while(deck.length && typeof deck[deck.length-1] !== "number" && safety--) deck.unshift(deck.pop());
  currentCard = deck.pop();
  drawReference(currentCard);
  setStatus("Guess Higher, Lower, or Blank");
}

function newRound(){
  deck = shuffle(buildDeck());
  dealFirstNumber();
  updateRemaining();
  resetDeckFace();
  clearSpecialClasses();
  hideLoseScreen();
}

function setStatus(msg){ statusEl.textContent = msg; }
function updateRemaining(){ remainingEl.textContent = `Deck: ${deck.length}`; }

function drawReference(v){
  lastTextEl.textContent = String(v);
  const hint = document.getElementById("refHint");
  if (hint) hint.textContent = `Compare against: ${v}`;
}

function resetDeckFace(){ deckFront.textContent = "?"; deckBack.textContent = "?"; }
function haptic(ms=15){ if (navigator.vibrate) navigator.vibrate(ms); }
function disableButtons(disabled){
  ["btnHigher","btnLower","btnBlank","newGame"].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.classList.toggle("disabled", !!disabled);
  });
}
function clearSpecialClasses(){
  deckCardEl.classList.remove("is-special","is-skip","is-pass","is-rev");
}

function computeSlideDelta(){
  const a = deckCardEl.getBoundingClientRect();
  const b = lastCardEl.getBoundingClientRect();
  const aCx = a.left + a.width/2, aCy = a.top + a.height/2;
  const bCx = b.left + b.width/2, bCy = b.top + b.height/2;
  return { dx: bCx - aCx, dy: bCy - aCy };
}

function revealNext(guess){
  if (isRevealing) return;
  if (!deck.length){ setStatus("Deck exhausted — reshuffling…"); haptic(20); newRound(); return; }

  isRevealing = true;
  disableButtons(true);
  setStatus("Sliding…");
  haptic(8);

  clearSpecialClasses();

  const next = deck.pop();
  updateRemaining();

  // compute slide distance to last card center
  const {dx, dy} = computeSlideDelta();

  // Strict blank rule evaluated after reveal
  const strictBlankLoss = (guess === "blank" && next !== "Blank");

  // Prepare the reveal text for the flip (back face)
  deckBack.textContent = (typeof next === "number") ? String(next) : next;

  // Trigger flip animations on faces for 3s while the slide runs
  deckCardEl.classList.add("animating");

  // Slide the whole card over the last card (3s)
  const slide = deckCardEl.animate(
    [
      { transform: "translate(0,0)" },
      { transform: `translate(${dx}px, ${dy}px)` }
    ],
    { duration: 3000, easing: "ease", fill: "forwards" }
  );

  slide.onfinish = () => {
    // Flip finished too (3s, via CSS). Evaluate the outcome.
    deckCardEl.classList.remove("animating");

    // Loud highlight for specials
    if (typeof next !== "number" && next !== "Blank"){
      deckCardEl.classList.add("is-special");
      if (next === "Skip")    deckCardEl.classList.add("is-skip");
      if (next === "Pass")    deckCardEl.classList.add("is-pass");
      if (next === "Reverse") deckCardEl.classList.add("is-rev");
      // Extra emphasis in status
      setStatus(`${next}! Previous number (${currentCard}) stays — guess again.`);
    }

    if (strictBlankLoss){
      haptic(30);
      setStatus("Wrong guess — you called Blank.");
      showLoseScreen(next);
      return finishReveal();
    }

    if (typeof next === "number"){
      const correct = (guess === "higher" && next > currentCard) || (guess === "lower" && next < currentCard);
      if (correct){
        haptic(10);
        currentCard = next;
        drawReference(currentCard);
        setStatus("Nice! Keep going.");
      } else {
        haptic(30);
        setStatus("Wrong guess.");
        showLoseScreen(next);
      }
    } else {
      if (next === "Blank"){
        haptic(12);
        setStatus("Correct: Blank! Previous number stays.");
      }
      // Skip/Pass/Reverse status already set above
    }

    finishReveal();
  };

  slide.oncancel = () => {
    // Safety: reset if animation gets cancelled
    deckCardEl.classList.remove("animating");
    finishReveal();
  };
}

function finishReveal(){
  // Snap deck card back to origin, then reset faces; re-enable input
  deckCardEl.animate(
    [{ transform: getComputedStyle(deckCardEl).transform }, { transform: "translate(0,0)" }],
    { duration: 250, easing: "ease", fill: "forwards" }
  ).onfinish = () => {
    resetDeckFace();
    disableButtons(false);
    isRevealing = false;
  };
}

/* Lose Screen */
function showLoseScreen(revealed){
  if (!loseOverlay) return;
  loseMsg.textContent = `You revealed ${revealed}.`;
  loseOverlay.classList.remove("hidden");
}
function hideLoseScreen(){ if (loseOverlay) loseOverlay.classList.add("hidden"); }

/* SW update helpers (unchanged) */
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
  let deferredPrompt; const installBtn=document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e)=>{ e.preventDefault(); deferredPrompt=e; installBtn.hidden=false; });
  installBtn?.addEventListener("click", async ()=>{ installBtn.hidden=true; deferredPrompt?.prompt(); await deferredPrompt?.userChoice; deferredPrompt=null; });
});