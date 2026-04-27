/**
 * @author Vienna Ly
 * SME: Heather Epp
 * May 29, 2019 BCIT Learning & Teaching Center
 * Update: 2026 
 * (for NSHA, SME: Jean Dehaan)
 * - fix for D2L edit mode scrubbing <animate> elements in svgs when saved
 * - moved svg to external HTML, which is loaded in an iframe
 * - updated event handling to post messages to iframe instead of directly manipulating svg elements from parent page
 * - Calculate MAP from BP values, add to monitor table
 * - Reordered monitor values to be more typical (HR, BP, MAP, RR, SpO2, Temp)
 * - if monitor setting is blank, hide the parent table cell 
 *  
 * require: 
 *  - jquery
 *  - archieSVGTemplate.html loaded in an iframe with id 'svg_frame' 
 *  
 *  Archie settings can be set by: table data (from html table) 
 *  -- user not able to adjust input sliders
 *  -- auto general UI menu for selecting table sets
 *  
 *  If there are no tables, user can adjust the inputs manually
 * 
 *  host: 
 *  - index.html -- learn.bcit.ca course Content page
 *  - scripts -- ltc.bcit.ca/multimedia/_SOH/2DBloodVesselsController
 */

$(document).ready(function () {
    let archie = new Archie();
    
    if ( $("table").length > 0){
        // read from table(s) to get case(s) settings
        let cases = getSettingsFromTable();  

        // create UI for selecting cases & settings
        ui_createCasesUI(cases, archie);
        
    }
    
    function getSettingsFromTable($tab = $("table:not(.ui-options)")){
        // @$tab: table element
        // returns settings object 
        // - by default gets table(s) available on page
        // - each table is a case
        // - each row is a settings object for Archie.  See Archie for default settings.
        
        let tablesElems = $.makeArray( $tab );
        
        let _cases = tablesElems.map( (tableElem, table_n )=> {
            let headingsElems = $.makeArray( $(tableElem).find("th") );
            let headings = headingsElems.map( th => { return $(th).text().trim().toLowerCase(); });         
            let rowsElems = $.makeArray( $(tableElem).find("tr") );
            let settings = [];
            let initialSetting = {}; // first content row contains default content
            
            rowsElems.shift(); //remove first row (headings)   
            
            settings = rowsElems.map( (tr,row_n) => {
                
                let values = $.makeArray( $(tr).find("td") );
                let setting = {_table_: table_n,_row_:row_n};
                                
                $.each(headings, (i, key)=>{
                    // iterate through setting's parameters
                    let $td = $(values[i]);
                    let content = $td.text().trim();
                   
                    // no content -- use first row content
                    if ( !content && initialSetting[key] ){
                        content = initialSetting[key];  
                    }
                    
                    setting[key] = content;
                });
                
                if (row_n == 0){
                    // save first content row as default content
                    initialSetting = setting;
                }
                
                return setting;
                
            });
                        
            return settings;
        });
        
        $tab.remove();
        return _cases;
        
    }
    
    function ui_createCasesUI(cases, archie){
        let $desccontainer = $("<div id='descriptionbox'/>");
        let $showhideBtn = $("<div class='showhideBtn'/>");
        let $title = $("<h1 id='case_title'/>");
        let $subtitle = $("<h2 id='case_subtitle'/>");
        let $desc = $("<div id='case_description'/>");        
        let $menu = $("<div id='menu'/>");
        let buttonHtml = "<button />";
           
        // create buttons for loading settings to archie
        $.each(cases, (n,settings)=>{
            let $menuitemcontainer = $("<div class='menu ui-options'>");  
            
            $menu.append($menuitemcontainer);
            
            for ( let i = 0; i < settings.length ; i++){
                let setting = settings[i];
                let $optBtn = $(buttonHtml).addClass("_caseOptionBtn");
                let btnOptionText = setting.title || "no title";
                
                $optBtn.text(btnOptionText);
                $optBtn.addClass("_menu_" + n);
                
                // event
                $optBtn.on("click", function(){
                    
                    // set archie values
                    archie.SetValues(setting);  
                    
                    $('._caseOptionBtn').removeClass('selected');
                    $(this).addClass('selected'); //console.log( $(this) );
                    
                    // Set text content
                    $title.text(settings[0].title);
                    if ( i>0 ){
                        $subtitle.text(setting.title);
                    }else{
                        $subtitle.text("");
                    };
                    
                    if (setting.description){
                        $desc.html(setting.description);
                        $desccontainer.removeClass('closed');
                    };
                });
                $menuitemcontainer.append($optBtn);
                
            }
        });
               
        $desccontainer.append($showhideBtn, $title, $subtitle, $desc);
        
        $("body").append($desccontainer,$menu);    
        
        $(".showhideBtn").on("click", function(){ $(this).parent().toggleClass('closed'); });
        
        ui_createMonitor($desccontainer);
                
        // default - set archie to first case, first scenario
        $("._caseOptionBtn._menu_0:first-child").trigger("click");
    };   
    
    function ui_createMonitor($container = $("body")){
        // creates monitor
        let $table = $("<table/>");
        let mapContent = "<td id='map'/>";
        let content = [
            ["HR bpm", "<td id='hr'/>"],
            ["BP mmHg", "<td><span id='bpsys'/>/<span id='bpdia'/> (<span id='map'/>)</td>"],
            ["RR bpm", "<td id='rr'/>"],
            ["O2 Sat %", "<td id='o2'/>"],
            ["Temp.", "<td id='temp'/>"]            
        ];
        
        $table.attr("id", "monitor").addClass("ui-options");
        
        $.each(content, (i, ar)=>{
            $table.append("<tr><td>" + ar[0] + "</td>" + ar[1]);     
        });
        
        $container.append($table);
        
    }
           
});

class Archie{
    constructor(options){
        
        let settings = {
            hr: 100,
            rr: 20,
            o2: 98,
            temp: 37.5,
            bpsys: 100,
            bpdia: 70,
            peripheral: 0.5,
            core: 0.5,
            contractility: 0.5,
            brain: 1,
            kidney: 1,
            lungfill: 0
        }
       
        this.initial = $.extend(settings, options);   
        this.$userControlToggle = this.ui_createInputDisableToggle();
        this.init();
    }
    
    init() {
              
        // remove inline styles added for hiding elements in D2L edit mode
        $("*:not(table)").attr("style","");
               
        this.reset();
                
    }
    
    ui_createInputDisableToggle($parent = $('body')){
        // UI for switch to enable or disable input controls
        let id = "userControlToggle";
        let html = "<label class='switch' title='Toggle manual controls'>"
                    + "<input id = '" + id +"' type='checkbox' checked />"
                    +"<span class='slider'></span></label>";
         
        $(html).prependTo($parent);
        
        let $input = $("#"+id);
        $input.on("change", function(){
            let allowUserInput = $(this).prop('checked');
            
            if (allowUserInput){
                $(this).trigger('enable');
            }else{
                $(this).trigger('disable');
            }
        });
        $input.on("enable", function(){            
            $(this).prop('checked', true);
            $("input:not(:checkbox)").prop('disabled', false);
            $('.selected').removeClass('selected');       
            $("#descriptionbox").addClass('closed');
            $("#ui-controls").show();
            $("#svg_container").css({"left":170});
        });
        $input.on("disable", function(){      
            $(this).prop('checked', false);
            $("input:not(:checkbox)").prop('disabled', true);
            $('.selected').removeClass('selected');       
            $("#descriptionbox").addClass('closed');
            $("#ui-controls").hide();
            $("#svg_container").css({"left":0});
        });
        
        return $input;
    }
    
    reset() {
        this.SetValues();
    }
    
    SetValues(settings = this.initial){
              
        $.each(settings, (id, v)=>{
            let $elem = $("#"+id);
            let $input = $("#ui-"+id);
            
            if ($elem.length>0){
                const $elemparent = $elem.parent();

                if (v === ""){
                    // if value is blank, hide parent table cell
                    $elemparent.hide();
                }else{
                    $elemparent.show();
                }

                // if this is a BP value, need to recalculate MAP
                if (id == "bpsys" || id == "bpdia"){
                    // calculate MAP and set value
                    let map = settings.bpsys && settings.bpdia ? Math.round( (parseInt(settings.bpsys) + 2*parseInt(settings.bpdia))/3 ) : "";
                    const $map = $("#map");
                    if ($map.length>0){
                        $map.text(map);
                    } 
                }

                $elem.text(v);
            }
            
            if ($input){
                $input.val(v).trigger("oninput");
            }
        });
        
        this.$userControlToggle.trigger('disable');
                      
    }
    
    SetInput(val, id) {    
        $("#ui-" + id).val(val).trigger("oninput");       
    }    
        
}

/* Event handlers */

function setHR(val, selector) {    
    const iframe = document.getElementById('svg_frame');
    // @val, bpm                  
    iframe.contentWindow.postMessage({
        type: 'SET_HR',
        value: val,
        selector: selector
    }, '*');

}

function setContractility(val=0.5) {
    const iframe = document.getElementById('svg_frame');
    iframe.contentWindow.postMessage({
        type: 'SET_CONTRACTILITY',
        value: val
    }, '*');
}

function setOpacity(val=1, id) {
    const iframe = document.getElementById('svg_frame');
    iframe.contentWindow.postMessage({
        type: 'SET_OPACITY',
        value: val,
        id: id
    }, '*');
}

function setLungFill(val=0, id = "#svg-lungfill") {
    const iframe = document.getElementById('svg_frame');
    iframe.contentWindow.postMessage({
        type: 'SET_LUNG_FILL',
        value: val,
        id: id
    }, '*');
    
}

function setSVGTime( val, targetsvg_id, dur = 9) {
    const iframe = document.getElementById('svg_frame');
    iframe.contentWindow.postMessage({
        type: 'SET_SVG_TIME',
        value: val,
        targetsvg_id: targetsvg_id,
        dur: dur
    }, '*');
}

function setSVGDur(selector, val){
    const iframe = document.getElementById('svg_frame');
    iframe.contentWindow.postMessage({
        type: 'SET_SVG_DUR',
        value: val,
        selector: selector
    }, '*');
}


function setBloodFlowRate(){
    const iframe = document.getElementById('svg_frame');
    iframe.contentWindow.postMessage({
        type: 'SET_BLOOD_FLOW_RATE'
    }, '*');
}