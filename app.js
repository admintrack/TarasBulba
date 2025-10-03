// Taras Bulba — deck slides OVER discard; static deck stays below.
// Special label appears ONLY on the last (discard) card. Overlay is above all.

const BUILD_VERSION = "v6"; // ⬅️ bumped

let deck = [];
let currentCard = null;
let isRevealing = false;
let lastLabel;

const SPECIALS = ["Blank", "Skip","Skip","Pass","Pass","Reverse","Reverse"];

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildDeck(){return [...Array.from({length:14},(_,i)=>i+1),...SPECIALS];}

function setStatus(msg){document.getElementById("status").textContent=msg;}
function updateRemaining(){document.getElementById("remaining").textContent=`Deck: ${deck.length}`;}
function drawReference(v){
  document.getElementById("lastText").textContent=v;
  document.getElementById("refHint").textContent=`Compare against: ${v}`;
  showLabel(lastLabel, null);
}
function resetDeckFace(){
  document.getElementById("deckFront").textContent="?";
  document.getElementById("deckBack").textContent="?";
}
function showLabel(el,text){
  if(!el) return;
  if(text){ el.textContent=text; el.classList.remove("hidden"); }
  else{ el.textContent=""; el.classList.add("hidden"); }
}

function newRound(){
  deck = shuffle(buildDeck());
  while(typeof deck[deck.length-1]!=="number"){deck.unshift(deck.pop());}
  currentCard = deck.pop();
  drawReference(currentCard);
  resetDeckFace();
  updateRemaining();
  hideLoseScreen();
  setStatus("Guess Higher, Lower, or Blank");
}

function computeSlideDelta(){
  const a=document.getElementById("deckCard").getBoundingClientRect();
  const b=document.getElementById("lastCard").getBoundingClientRect();
  return {dx:(b.left+b.width/2)-(a.left+a.width/2),dy:(b.top+b.height/2)-(a.top+a.height/2)};
}

function revealNext(guess){
  if(isRevealing) return;
  if(!deck.length){ newRound(); return; }
  isRevealing = true; disableButtons(true); setStatus("Sliding…");

  const next = deck.pop(); updateRemaining();
  const {dx,dy} = computeSlideDelta();

  // Back face shows revealed value; flip runs while sliding
  document.getElementById("deckBack").textContent = next;
  const deckCard = document.getElementById("deckCard");
  deckCard.classList.add("animating","on-top"); // ensure slides OVER discard

  const slide = deckCard.animate(
    [{transform:"translate(0,0)"},{transform:`translate(${dx}px,${dy}px)`}],
    {duration:3000,easing:"ease",fill:"forwards"}
  );

  slide.onfinish = () => {
    deckCard.classList.remove("animating");
    evaluate(next,guess);
    finishReveal();
  };
  slide.oncancel = () => {
    deckCard.classList.remove("animating");
    finishReveal();
  };
}

function evaluate(next,guess){
  // Loss conditions:
  // 1) You CALL Blank but draw a NUMBER -> loss.
  const loseByBlankCallNumber = (guess === "blank" && typeof next === "number");
  // 2) You do NOT call Blank but draw BLANK -> instant loss (new rule).
  const loseByUnexpectedBlank = (guess !== "blank" && next === "Blank");

  if (loseByBlankCallNumber) {
    setStatus("Wrong guess — called Blank but drew a number.");
    showLoseScreen(next);
    return;
  }
  if (loseByUnexpectedBlank) {
    setStatus("Wrong guess — drew Blank without calling it.");
    showLoseScreen(next);
    return;
  }

  if(typeof next==="number"){
    const correct = (guess==="higher" && next>currentCard) || (guess==="lower" && next<currentCard);
    if(correct){
      currentCard = next;
      drawReference(currentCard);
      setStatus("Nice! Keep going.");
    } else {
      setStatus("Wrong guess.");
      showLoseScreen(next);
    }
  } else {
    // Specials (Skip/Pass/Reverse) and the called-Blank-correct case
    if(next==="Blank"){
      // Reaching here means guess === "blank" (correct)
      setStatus("Correct: Blank! Previous number stays.");
      showLabel(lastLabel, "Blank");
    } else {
      // Skip / Pass / Reverse → number stays, show label on last only
      setStatus(`${next}! Previous number (${currentCard}) stays.`);
      showLabel(lastLabel, next);
    }
  }
}

function finishReveal(){
  const deckCard = document.getElementById("deckCard");
  deckCard.animate(
    [{transform:getComputedStyle(deckCard).transform},{transform:"translate(0,0)"}],
    {duration:250,fill:"forwards"}
  ).onfinish = () => {
    deckCard.classList.remove("on-top");
    resetDeckFace();
    disableButtons(false);
    isRevealing = false;
  };
}

function disableButtons(d){
  ["btnHigher","btnLower","btnBlank","newGame"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle("disabled", d);
  });
}

function showLoseScreen(v){
  document.getElementById("loseCardName").textContent = v;
  document.getElementById("loseOverlay").classList.remove("hidden");
}
function hideLoseScreen(){
  document.getElementById("loseOverlay").classList.add("hidden");
}

window.addEventListener("load",()=>{
  lastLabel = document.getElementById("lastLabel");

  document.getElementById("btnHigher").onclick = ()=> revealNext("higher");
  document.getElementById("btnLower").onclick  = ()=> revealNext("lower");
  document.getElementById("btnBlank").onclick  = ()=> revealNext("blank");
  document.getElementById("newGame").onclick   = ()=> newRound();
  document.getElementById("restartBtn").onclick= ()=> newRound();

  // Show build version in footer
  const tag=document.getElementById("buildTag");
  if(tag) tag.textContent = `Build: ${BUILD_VERSION}`;

  newRound();
});