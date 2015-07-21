var graphData;
var graphDict = new Object();
var candidate;
var clickedWord;
var focusWord;
var foundWords;
var preFoundWords;

var graphJSON = function() {}
graphJSON.prototype = {
  source: "",
  target: "",
  value: 1
}

var loadGraphData = function(){
  $.ajax( './js/data.json')
  .done(function(data){
    graphData = data.links;
    graphData.forEach(function(g){
      if(!graphDict.hasOwnProperty(g.source))
        graphDict[g.source] = [];
      graphDict[g.source].push(g.target);
    });
    drawGraph(graphData, []);
    $('#graph_area').empty();
  });
};

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
        $("#edit_area").val(editContent.substring(0, cursorPos)+d.name+editContent.substring(cursorPos));
        console.log();
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

function setSelectionRange(input, selectionStart, selectionEnd) {
  input.focus();
  input.setSelectionRange(selectionStart, selectionEnd);
}

function setCaretToPos (input, pos) {
  setSelectionRange(input, pos, pos);
}


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
      if(candidate.length < 50){
        findTarget(json.target, existsDict);
      }
    }
  }
  if(candidate.length == 0){
    $('#not_found').html("<div>Not found</div>");
  }else{
    $('#not_found').html("");
  }
  
  if(preFoundWords == null){
    drawGraph(candidate, foundWords);
  }else{
    if (preFoundWords.toString() != foundWords.toString()){
      drawGraph(candidate, foundWords);
    }
  }
  preFoundWords = foundWords;
}

function findTarget(searchWord, existsDict){
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
      if (candidate.length < 10)
        findTarget(json.target, existsDict); //Recurrence
    }
  });
}


function changeSlider(){
  $('#graph_area').css({
    "width": 100-$('#graph_slider').val()+"%"
  });
  $('#edit_area').css({
    "width": $('#graph_slider').val()+"%"
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
        if($('#search_input').get(0)){
          $('#search_input').remove();
        }else{
          $('#search_area').html("<input type='search' id='search_input'></input>");
        }
      }
    }
  });
  
  $('#search_area').keyup(function(e){
    focusWord = $('#search_input').val();
    if(focusWord.length >= 2){
      searchCandidates();
    }
  });
  
  $(window).on("beforeunload",function(e){
    return "Did you save?";
  });
});