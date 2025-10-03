/* Taras Bulba — Deck slides over Last Card, then flips (3s). Strict blank rule. Clearer specials. */

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

  // Prepare the animation: slide towards last card and flip (3s)
  const {dx, dy} = computeSlideDelta();
  deckCardEl.style.setProperty("--dx", `${dx}px`);
  deckCardEl.style.setProperty("--dy", `${dy}px`);

  // Strict blank rule evaluated after reveal; but we already know 'next'
  const strictBlankLoss = (guess === "blank" && next !== "Blank");

  // Put revealed value on the back so it appears after flip
  deckBack.textContent = (typeof next === "number") ? String(next) : next;

  // Start slide+flip
  deckCardEl.classList.add("animating");

  // Total animation duration = 3000ms
  setTimeout(()=> {
    // Animation complete: evaluate outcome
    deckCardEl.classList.remove("animating");

    // Highlight specials loudly
    if (typeof next !== "number" && next !== "Blank"){
      deckCardEl.classList.add("is-special");
      if (next === "Skip")    deckCardEl.classList.add("is-skip");
      if (next === "Pass")    deckCardEl.classList.add("is-pass");
      if (next === "Reverse") deckCardEl.classList.add("is-rev");
    }

    if (strictBlankLoss){
      haptic(30);
      setStatus("Wrong guess — you called Blank.");
      showLoseScreen(next);
      finishReveal(); return;
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
      } else {
        haptic(10);
        setStatus(`${next}! Previous number (${currentCard}) stays — guess again.`);
      }
    }

    finishReveal();
  }, 3000);
}

function finishReveal(){
  // Snap deck card back to origin position (smoothly) and reset faces
  deckCardEl.style.transition = "transform .25s ease";
  deckCardEl.style.transform = "translate(0,0)";
  setTimeout(()=>{
    deckCardEl.style.transition = "";
    resetDeckFace();
    disableButtons(false);
    isRevealing = false;
  }, 260);
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