var graphData;
var graphDict = new Object();
var candidate;
var filteredCandidate;
var focusWord = "";
var foundWords;
var filteredFoundWords;
var preFoundWords;
var clickedWord;
var repoList = new Object();
var repoListDir = "./repolist/"
var enabledMethod = true;
var enabledString = true;
var enabledComment = true;
var enabledNormal = true;
var enabledPM = false;
var srcSearchWords;

var graphJSON = function() {}
graphJSON.prototype = {
  source: "",
  target: "",
  value: 1
}

var loadGraphData = function(){
  $.ajax('./js/data.json')
  .done(function(data){
    graphData = data.links;
    graphData.forEach(function(g){
      if(!graphDict.hasOwnProperty(g.source)) //check key
        graphDict[g.source] = [];
      graphDict[g.source].push(g.target);
    });
    drawGraph(graphData, []);
    $('#graph_area').empty();
  });
}; // -> drawGraph

var drawGraph = function(graphData, foundWords){
  $('#graph_area').empty();
  var width = $("#graph_area").width();
  var height = $("#graph_area").height();

  var force = d3.layout.force()
                .size([ width, height ])
                .linkDistance(60).charge(-300);

  var svg = d3.select("#graph_area").append("svg")
              .attr("width", width)
              .attr("height", height);

  svg.append("svg:defs")
    .selectAll("marker")
    .data([ "end" ])
    .enter().append("svg:marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

  var nodes = {}
  graphData.forEach(function(link) {
      link.source = nodes[link.source] || (nodes[link.source] = {
          name: link.source
      });
      link.target = nodes[link.target] || (nodes[link.target] = {
          name: link.target
      });
      link.value = +link.value;
  });
    
  var path = svg.append("svg:g")
              .selectAll("path")
              .data(graphData)
              .enter().append("svg:path")
              .attr("class", "link")
              .attr("marker-end", "url(#end)");

  force.nodes(d3.values(nodes))
       .links(graphData)
       .start();

  var node = svg.selectAll(".node")
                .data(force.nodes())
                .enter().append("g")
                .attr("class", "node")
                .call(force.drag);

  node.append("circle")
      .on("mousedown", function(d){
        clickedWord = d.name;
      })
      .on("dblclick", function(d){
        var editContent = $("#edit_area").val();
        var cursorPos = $("#edit_area").prop("selectionStart");
        $("#edit_area").val(editContent.substring(0, cursorPos)+" "+d.name+editContent.substring(cursorPos));
      })
      .attr("class", function(d){
        return parserWord(d.name);
      })
      .attr("r", 6);

  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(function(d) {
        return d.name;
      })
      .style("font-weight", function(d){
        if(foundWords.length > 0){
          if(foundWords.indexOf(d.name) >= 0){
            return "bold";
          }
        }
        return "normal";
      });
  
  force.on("tick", function(){
      path.attr("d", function(d) {
          var dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
      });

      node.attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
      });
  });
};

function isDisplay(word){
  var wordType = parserWord(word);
  if(wordType == "method"){
    return enabledMethod;
  }
  if(wordType == "string"){
    return enabledString;
  }
  if(wordType == "comment"){
    return enabledComment;
  }
  if(wordType == "normal"){
    return enabledNormal;
  }
  return false;
} // -> parserWord

function getSrcPaths(word){ 
  var parent = document.getElementsByClassName('src_search_word');
  for(var i=0; i<parent.length; i++){
    $('#'+parent[i].id).css("color", "grey");
  }
  $('#'+word).css("color", "white");
  var filename;
  if(!word.match("[a-zA-Z]")){
    filename = "symbols";
  }else{
    filename = word.slice(0,2);
  }
  $.ajax(repoListDir+filename+".txt")
  .fail(function(file){
    $('#source_text').text("Not found");
    return;
  })
  .done(function(file){
    console.log(file);
    var items = $.grep(file.split('\n'), function(d){
      if(d != "") return d;
    });
    for(var i=0; i<items.length; i++){
      var item = $.grep(items[i].split(':'), function(d){
        if(d != "") return d;
      });
      var count = 0;
      console.log(item[1]);
      repoList[item[0]] = $.grep(item[1].split(','), function(d){
        if(d != "" && count < 20){
          count++;
          return d;
        }
      });
    }
    word = word.replace(" ","");
    if(repoList[word] == undefined){
      $('#search_paths_tab').empty();
      $('#source_text').text("Not found");
      return;
    }else{
      $('#source_text').text("");
    }
    setSrcPaths(repoList[word].join(','));
  });
} // -> setSrcPaths

function setSrcPaths(paths){
  $('#search_paths_tab').empty();
  paths = $.grep(paths.split(','), function(p){
    if(p!="") return p;
  });
  for(var i=0; i<paths.length; i++){
    var winpath = $.grep(paths[i].split('\\'),function(f){
        if(f!="") return f;
      });
      var unixpath = $.grep(paths[i].split('/'), function(f){
        if(f!="") return f;
      });
      var filename = (winpath.length > unixpath.length) ? winpath[winpath.length-1]:unixpath[unixpath.length-1];
      $('#search_paths_tab').append("<div class='src_path' id='s_a"+i+"' onclick='showSource(\""+paths[i].split("\\").join("\\\\")+"\",\"s_a"+i+"\")'>"+(i+1)+"</div");
      $('#s_a'+i).css("width", (100/paths.length)+"%")
  }
}

function getDupSrcPaths(words){
  var parent = document.getElementsByClassName('src_search_word');
  for(var i=0; i<parent.length; i++){
    $('#'+parent[i].id).css("color", "grey");
  }
  $('#BOTH').css("color", "white");
  words = $.grep(words.split(':'), function(w){
    if(w!= "") return w;
  });
  var dupSrcPaths = [];
  for(var i=0; i<repoList[words[0]].length; i++){
    dupSrcPaths.push(repoList[words[0]][i]);
  }
  for(var i=1; i<words.length; i++){
    if(repoList[words[i]] == undefined)
      continue;
    var tmpDupSrcPaths=[];
    for(var j=0; j<repoList[words[i]].length; j++){
      if(dupSrcPaths.indexOf(repoList[words[i]][j]) >=0){
        tmpDupSrcPaths.push(repoList[words[i]][j]);
      }
    }
    dupSrcPaths = [];
    for(var j=0; j<tmpDupSrcPaths.length; j++){
      dupSrcPaths.push(tmpDupSrcPaths[j]);
    }
  }
  if(dupSrcPaths.length == 0){
    $('#search_paths_tab').empty();
    $('#source_text').text("Not found");
  }else{
    setSrcPaths(dupSrcPaths.join(','));
  }
} // -> setSrcPaths

function showSource(path, elementId){
  var parent = document.getElementsByClassName('src_path');
  for(var i=0; i<parent.length; i++){
    $('#'+parent[i].id).css("color", "grey");
  }
  $('#'+elementId).css("color", "white");
  var winpath = $.grep(path.split('\\'),function(f){
    if(f!="") return f;
  });
  var unixpath = $.grep(path.split('/'), function(f){
    if(f!="") return f;
  });

  path = (winpath.length > unixpath.length) ? winpath.slice(1).join('/') : unixpath.slice(1).join('/');
  $.ajax(repoListDir+path)
  .done(function(data){
    var d;
    for(var i=0; i<srcSearchWords.length; i++){
      d = data.split(srcSearchWords[i]).join("<span id='search_word'>"+srcSearchWords[i]+"</span>");
    }
    $('#source_text').html(d);
  });
  $('#search_path').text(repoListDir+path);
}

function setSelectionRange(input, selectionStart, selectionEnd) {
  input.focus();
  input.setSelectionRange(selectionStart, selectionEnd);
}

function setCaretToPos (input, pos) {
  setSelectionRange(input, pos, pos);
} // -> setSelectionRange

function parserWord(word){
  if(word.match(/^"/)){ //String
    return "string";
  }
  if(word.match(/^#/)){ //Comment
    return "comment";
  }
  if(word.match(/.+\(/)){ //Method
    return "method";
  }
  return "normal";
}

function searchCandidates(){
  if(focusWord == ""){
    return;
  }
  preFoundWords = foundWords;
  candidate = [];
  foundWords = [];

  var existsDict = new Object();
  for(var i=0; i<graphData.length; i++){
    if(graphData[i].source.name.indexOf(focusWord) >= 0){
      if(enabledPM){
        if(graphData[i].source.name.toString() != focusWord.toString()){
          continue;
        }
      }
      var json = new graphJSON();
      json.source = graphData[i].source.name;
      json.target = graphData[i].target.name;
      if(!existsDict.hasOwnProperty(json.source)){
        existsDict[json.source] = [];
      }
      existsDict[json.source].push(json.target);
      candidate.push(json);
      foundWords.push(graphData[i].source.name);
      if(candidate.length > 300){
        break;
      }
      if(candidate.length < 100){
        findTargetR(json.target, existsDict);
      }
    }
  }
  if(candidate.length == 0){
    $('#not_found').css("display", "inline");
  }else{
    $('#not_found').css("display", "none");
  }
  
  if(preFoundWords == null){
    drawGraph(candidate, foundWords);
  }else{
    if (preFoundWords.toString() != foundWords.toString()){
      drawGraph(candidate, foundWords);
    }
  }
  preFoundWords = foundWords;
} // -> findTargetR -> drawGraph

function findTargetR(searchWord, existsDict){
  if(!graphDict.hasOwnProperty(searchWord)){
    return;
  }
  if(!existsDict.hasOwnProperty(searchWord)){
    existsDict[searchWord] = [];
  }
  graphDict[searchWord].forEach(function(g){
    if(existsDict[searchWord].indexOf(g) >= 0){
    }else{
      var json = new graphJSON();
      json.source = searchWord;
      json.target = g;
      existsDict[searchWord].push(g);
      candidate.push(json);
      if (candidate.length < 100)
        findTargetR(json.target, existsDict); //Recurrence
    }
  });
}

function filterCandidate(){
  filteredCandidate = [];
  filteredFoundWords = [];
  for(var i=0; i<candidate.length; i++){
    var json = new graphJSON();
    json.source = candidate[i].source.name;
    json.target = candidate[i].target.name;
    if(isDisplay(candidate[i].target.name)){
      filteredCandidate.push(json);
      filteredFoundWords.push(candidate[i].target.name);
    }
  }
  drawGraph(filteredCandidate, filteredFoundWords);
}

function changeSlider(){
  $('#graph_area').css({
    "width": 100-$('#graph_slider').val()+"%"
  });
  $('#edit_area').css({
    "width": $('#graph_slider').val()+"%"
  });
  $('.source_area').css({
    "width": $('#graph_slider').val()+"%"
  });
  $('#display_item').css({
    "left": $('#graph_slider').val()+"%"
  });
  foundWords = [];
  searchCandidates();
};

var resizeTimer = false;
$(window).resize(function() {
    if (resizeTimer !== false) {
        clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(function() {
        foundWords = [];
        searchCandidates();
    }, 200);
});

$(document).ready(function(){
  $("#edit_area").keydown(function(e){
    var start = this.selectionStart,
          end = this.selectionEnd;
    if(e.keyCode === 9){ // \t
      var spaces = "    ";
      this.value = this.value.substring(0, start) + spaces + this.value.substring(end);
      setCaretToPos(document.getElementById("edit_area"), start+spaces.length);
      return false;
    }
    
    if(e.keyCode == 32){// Space
    }
    
    if(e.keyCode == 13){ // Enter
    }
    
    if(e.keyCode == 8){ //Del
    }
    
    if(e.keyCode == 190){ //period
      
    }
  });
  
  $("#edit_area").keyup(function(e){
    if(!$('#search_input').get(0) || $('#search_input').val() == ""){
      var start = this.selectionStart;
      var end;
      for (var i=start; i>=0; --i){
        end = i;
        if($('#edit_area').val().substring(end-1, end).match(/ |\n\r|\n|\r/))
          break;
      }
      focusWord = $('#edit_area').val().substring(end, start);
      focusWord = focusWord.split('.')[focusWord.split('.').length-1];
      if(focusWord.length >= 2){
        searchCandidates();
      }
    }
  });
  
  $(document).keyup(function(e){
    if(e.ctrlKey && e.shiftKey){
      if(e.keyCode == 70){ //f
        if($('#search_input').css("display")=="none"){
          $('#search_input').css("display", "inline");
          $('#search_input').val(focusWord);
        }else{
          $('#search_input').css("display", "none");
        }
      }
    }
  });
  
  $('#search_input').keyup(function(e){
    focusWord = $('#search_input').val();
    if(focusWord.length >= 2){
      searchCandidates();
    }
  });
  
  $('#search_words_input').keyup(function(e){
    $('#search_words_tab').empty();
    srcSearchWords = $.grep($('#search_words_input').val().split(' '), function(d){
      if(d!="") return d;
    });
    if(srcSearchWords.length >= 2){
      srcSearchWords.push("[BOTH]");
    }
    for (var i in srcSearchWords){
      if(srcSearchWords[i]=="[BOTH]"){
        $('#search_words_tab').append("<div class='src_search_word' id='BOTH' onclick='getDupSrcPaths(\""+srcSearchWords.join(':')+"\");'>[BOTH]</div");
        continue;
      }
      $('#search_words_tab').append("<div class='src_search_word' id='"+srcSearchWords[i]+"' onclick='getSrcPaths(\""+srcSearchWords[i]+" \");'>"+srcSearchWords[i]+"</div");
      $('#'+srcSearchWords[i]).css("width", (100/srcSearchWords.length)+"%");
    }
  });
  
  $('#method').change(function(){
    enabledMethod = $(this).prop('checked');
    filterCandidate();
  });
  $('#string').change(function(){
    enabledString = $(this).prop('checked');
    filterCandidate();
  });
  $('#comment').change(function(){
    enabledComment = $(this).prop('checked');
    filterCandidate();
  });
  $('#normal').change(function(){
    enabledNormal = $(this).prop('checked');
    filterCandidate();
  });
  $('#perfect_matching').change(function(){
    enabledPM = $(this).prop('checked');
    searchCandidates();
  });
  
  $(window).on("beforeunload",function(e){
    return "Did you save?";
  });
});