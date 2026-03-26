
document.addEventListener('DOMContentLoaded', () => {
    Init();
});
window.addEventListener('message', (event) => {
    const msg = event.data;
    
    if (msg.type === 'INIT') {
        Init();
    }
    if (msg.type === 'SET_HR') {
        setHR(msg.value, msg.selector);
    }

    if (msg.type === 'SET_CONTRACTILITY') {
        setContractility(msg.value);
    }

    if (msg.type === 'SET_OPACITY') {
        setOpacity(msg.value, msg.id);
    }

    if (msg.type === 'SET_LUNG_FILL') {
        setLungFill(msg.value, msg.id);
    }
    if (msg.type === 'SET_SVG_TIME') {
        setSVGTime(msg.value, msg.targetsvg_id, msg.dur);
    }
    if (msg.type === 'SET_SVG_DUR') {
        setSVGDur(msg.selector, msg.value);
    }
    if (msg.type === 'SET_BLOOD_FLOW_RATE') {
        setBloodFlowRate();
    }
});

function Init() {
    let peripheralsvg = document.getElementById("svg-peripheral");
    
    let coresvg = document.getElementById("svg-core");
    if (peripheralsvg != null){
        peripheralsvg.pauseAnimations();
    }
    
    if (coresvg != null){
        coresvg.pauseAnimations();
    }
}
function setHR(val, selector) {    
    // @val, bpm                  
    let sec = 60 / (val);
    let target = document.querySelector(selector);
    if (target) {
        target.style.animationDuration = sec + "s";
    }
}

function setContractility(val=0.5) {
    // @val, 0..1
    // sets css --contractility var for heartbeat stroke-width anim (0..10)
    document.documentElement.style.setProperty('--contractility', (1-val)*10);    
    //console.log("contractility:",val);
}

function setOpacity(val=1, id) {
    // @val, 0..1 
    let target = document.querySelector(id);
    if (target) {
        target.style.opacity = val;
    }
    if (target) {
        target.style.opacity = val;
    }
    //console.log(id,val);
}

function setLungFill(val=0, id = "#svg-lungfill") {
    // @val, 0...1  amt lung fill      

    let target = document.querySelector(id);
    if (target) {
        target.style.opacity = val;
    }
    let offsety = 312;
    let height = target.getAttribute("height"); 

    target.setAttribute("y", offsety - val*height);
    
}

function setSVGTime( val, targetsvg_id, dur = 9) {
    // @val: float, 0...1  normalized time   
    // @targetsvg_id, svg id to change
    // @dur: int, animation duration set in svg's animate 'dur' paramter
    // svg must have animate element
    let target = document.querySelector("svg" + targetsvg_id);
    
    if (target) {
        target.setCurrentTime(val*dur);
    }
    //console.log(targetsvg_id, val, dur, val*dur);
}

function setSVGDur(selector, val){
    // @selector: string, svg's id or class 
    // svg must have animate element
    
    const targets = document.querySelectorAll(selector);
    targets.forEach(target => {
        target.setAttribute("dur", val + "s");
    });
    
}


function setBloodFlowRate(){
    // blood flow based on core, peripheral and HR values
    // default duration 5s (p=0.5, c=0.5, hr=105bpm)
    const baseRate = 5;

    let p = Number( $("#ui-peripheral").val() ),  // peripheral dilation, 0...1
        c = Number( $("#ui-core").val() ),        // core dilation, 0...1
        ctr = Number($("#ui-contractility").val()) + 0.001,       // contractility, 0...1
        h = Number( $("#ui-hr").val() );          // hr, 10...200

    let rate = (baseRate * (105/h + p + c + 0.5/ctr)/3).clamp(0.1,10) ;
    
    setSVGDur(".dot animateMotion",rate); 
    console.log(105/h , p , c , 0.5/ctr);
}

/*Returns a number whose value is limited to the given range.
*
* @method Number.prototype.clamp
* @param {Number} min The lower boundary
* @param {Number} max The upper boundary
* @return {Number} A number in the range (min, max)
*/
Number.prototype.clamp = function(min, max) {
return Math.min(Math.max(this, min), max);
};
