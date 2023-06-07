var wordDict = {
  "adjective": ['[adjective]','engaging','funny','problem-based'],
  "length": ['[length]','20 minutes','1hr','90 min'],
  "subject": ['[subject]','geometry','alliteration and assonance','the cold war'],
  "num": ['[# students]','5','twenty','10-15'],
  "grade": ['[grade]','6th','second','11th'],
  "stuff": ['[standards, themes, cultural lens, etc]','6.RP.A.1','stories about Black entrepreneurs','cows']
};

var encouragement = [
  "Great idea! I'm brainstorming some ideas right now. I'll come up with three options for how to open the lesson. Arm yourself with your knowledge of your students and prepare to make a choice - it will set us off on our journey! PS: This is a lot. I was made in a weekend. What I'm trying to say is that I'm slow. Be patient!",
  "Ok. Based on that intro, I'll come up with three potential ways to introduce the new material.",
  "Ok, back to brainstorming. I'm thinking of some ideas for practice. You've given me a lot to think about! (that's a nice way of me saying <i>this part might take a while</i>. it will be worth it!)",
  "That was a great little deep dive into the lesson. Sit tight while I whip up some options for closing the lesson.",
  "Awesome! Now time to compile the lesson. Sit back and relax! Better yet, go get some more coffee. I should be done by the time you get back."
]

var titles = [
  "Lesson Hook",
  "Intro to new material",
  "Practice",
  "Closing",
  "Full Lesson",
  "Lesson Deep Dive"
]

var explanations = [
  "Think about how your students might respond to each of these lesson hooks. Click on an option to choose it and move on. For now, the option is locked in as soon as you click, so be careful.",
  "Same deal. which option makes the most sense for your students?",
  "Here are some ideas for practice. I've tried to make sure to include multiple forms of practice, as well as save time for independent practice. We'll take a deep dive on the option you choose.",
  "Here are some ideas for a closer. Choose the one that you like best! Afterwards, I'll compile all the choices you made into one lesson.",
  "",
  "Let's think about how you might implement the lesson you've shared with me!"
]

var round = 1;
var probe_num=0;
var static_lesson="";
var materials_exist = false;
var whatif_exist = false;
var static_materials = "";
var static_whatif = "";
var running_options = "";

function createCard(index, text) {
  let col = $('<div class="col-sm-4"></div>'); // or col-md-4 or col-lg-4 based on your requirements
  let card = $('<div class="card text-center m-2" style="width: 18rem;"></div>');
  let cardBody = $('<div class="card-body"></div>');
  let cardTitle = $('<h5 class="card-title"></h5>').text('Option ' + (index+1));
  let cardText = $('<p class="card-text"></p>').text(text);
  cardBody.append(cardTitle);
  cardBody.append(cardText);
  card.append(cardBody);
  card.attr('data-index', index);
  card.addClass('round-' + round);  // Attach the index to the card as a data attribute
  card.addClass('canClick');
  col.append(card);
  $('#optionCards').append(col);
}

function getCardIndex(card){
  var index = $(this).data('index');  // Retrieve the index from the clicked card
  index = Number(index) + 1;
  index = index.toString();
  return index
}

function getRandomWord(elementId){
  var index = Math.ceil(Math.random() * wordDict[elementId].length);
  return wordDict[elementId][index]
}

function Expand(obj){
  $(obj).attr('size', $(obj).attr('placeholder').length);
}

function handleChatResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  var sentence = "";

  // Create a new div for Sophia's message with an inner span for the text
  var messageDiv = $("<div class='sophia'><i style='color: Gray;'>Sophia: </i><span></span></div>");
  $('#pdfChatMessages').append(messageDiv);

  function streamData() {
    return reader.read().then(({done, value}) => {
      if (done) {
        return;
      }

      const chunks = decoder.decode(value, {stream: true}).split('\n');

      chunks.forEach(chunk => {
        if (chunk !== '') {
          try {
            const jsonResponse = JSON.parse(chunk);
            const content = jsonResponse.content;
            if (content !== undefined) {
              sentence += content;
            }
          } catch (error) {
            console.error('Error parsing chunk:', error);
            console.error('Chunk that caused error:', chunk);
          }
        }
      });

      // Append the sentence to the span within Sophia's message div
      messageDiv.find('span').append(sentence);
      sentence = "";
      return streamData();
    });
  }

  return streamData();
}


function handleResponse(response, card=true, ephemeral=true) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  var idx_counter = 0;
  var sentence = "";
  var response_catcher = [];

  function streamData(ephemeral) {

    return reader.read().then(({done, value}) => {

      if(ephemeral){
        $('#thoughts').fadeOut(3000, function(){
          $('#thoughts').empty();
        });
      }

      if (done) {
        if(ephemeral){
          console.log("done");
          console.log(response_catcher)
          const finalResponse = response_catcher[response_catcher.length - 1];

          return finalResponse;
        } else {
          return;
        }
      }

      const chunks = decoder.decode(value, {stream: true}).split('\n');

      chunks.forEach(chunk => {
        if (chunk !== '') {
          console.log('Chunk before parsing:', chunk);
          try {
            console.log('Type of chunk:', typeof chunk);
            const jsonResponse = JSON.parse(chunk);
            const content = jsonResponse.content;
            if (content !== undefined) {
              console.log(content)
              sentence += content;
            }
            response_catcher.push(jsonResponse);
          } catch (error) {
            console.error('Error parsing chunk:', error);
            console.error('Chunk that caused error:', chunk);
          }
        }
      });
      // console.log(sentence);
      if(ephemeral){
        if(sentence.length >=60){
          idx_counter++;
          if(idx_counter % 2 > 0){
            console.log("APPENDING BECAUSE COUNTER IS " + idx_counter)
            sentence = '...' + sentence + '...'
            const randomNumber = Math.floor(Math.random() * (120 - 20 + 1) + 20);
            $('#thoughts').append(sentence);
            $('#thoughts').show();
            $('#thoughts').css('padding',randomNumber.toString()+'px')
            sentence = "";
          }
          else{
            sentence = "";
          }
        }
        // existing lesson chat, show streaming.
      } else {
        $('#pdfChatMessages').append(sentence);
        sentence = "";
      }
      return streamData(ephemeral);
    });
  }
  return streamData(ephemeral);
}

$(document).ready(function(){
  // enable tooltips
  $('[data-toggle="tooltip"]').tooltip();

  // Show the splash page
  $("#splashPage").show();

  // Fade in the text sequentially
  $("#splashPage h1").fadeIn(1000, function() {
    $("#splashPage h2").fadeIn(1000, function() {
      // Wait one second, then fade out the entire splash page
      setTimeout(function() {
        $("#splashPage").fadeOut(2000);
        $(".madlib").show();
      }, 1000);
    });
  });

  $('#logo').on("mouseover",function(){
    $('#credit').css("opacity","1");
  });

  $('#logo').on("mouseout",function(){
    $('#credit').css("opacity","0");
  });


  $(".madlib").each(function() {
    currentLib = $(this).attr('id');

    // initial placeholder value
    $(this).attr('placeholder', wordDict[$(this).attr('id')][0]);

    var index = 1;
    var timer = setInterval(() => {
      $(this).attr('placeholder', getRandomWord($(this).attr('id')));
      Expand(this);
      index++;
    }, 5000);  // change every 5 seconds

    $(this).data('timer', timer); // Store timer id in data attribute
  });

  $(".madlib").focus(function() {
    clearInterval($(this).data('timer'));  // stop changing placeholder
  });

  // UPLOAD PDF SCRIPT
  $("#upload_link").click(function(e) {
    e.preventDefault();
    $('#madlibContainer').css("display", "none");
    $('#madlibContainer').css("height", "10px");
    $('#madlibContainer').hide();
    $('#madlibContainer').children().hide();
    $("#chooseFile").show();
  });

  $("#chooseFile").click(function() {
    $('#file_upload').click();
  });

  $("#file_upload").change(function() {
    var file = this.files[0];
    if (file) {
      $("input[type=submit]").show();
      $("#chooseFile").text(file.name);
    }
  });


  $("#pdfForm").on("submit", function(e) {
    e.preventDefault();
    $('#modelPicker').hide();

    var formData = new FormData();
    formData.append('pdf_file', $('#file_upload')[0].files[0]);

    fetch('/submit_pdf', {
      method: 'POST',
      body: formData
    }).then(async response => {
      $('#madlibContainer').css("display", "none");
      $('#madlibContainer').hide();
      $('#madlibContainer').children().hide();
      $('#pdfChatWindow').show();
      $('#introTitle').empty();
      $('#introTitle').append(titles[5]);
      $('#introTitle').show();
      $('#explanation').empty();
      $('#explanation').append(explanations[5]);
      $('#explanation').show();
      if (response.ok) {
        handleChatResponse(response);
      } else {
        throw new Error("Error: " + response.statusText);
      }
    });
  });

  $('#pdfSendButton').click(function() {

    var userMessage = $('#pdfChatInput').val();
    if (userMessage){
      $('#pdfChatMessages').append("<div class='you'><i style='color: Gray;'>You: </i>" + userMessage + "</div>");
      $('#pdfChatInput').val(""); //clear input field after submitting response

      $("#pdfSendButton").prop("disabled", true);

      fetch('/lesson_chat',{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({message: userMessage})
      }).then(async response =>{
        if (response.ok) {
          await handleChatResponse(response);
          $("#pdfSendButton").prop("disabled", false);
        } else {
          throw new Error("Error: " + response.statusText);
        }
      })
    }
  });


  // MADLIB SUBMITTED -> INTRO CHOICES

  // STREAMING VERSION
  $("#madlibForm").on("submit", function(e) {
    e.preventDefault();  // Prevent the form from causing a page refresh.
    $("#madlibContainer").removeClass("d-flex align-items-center");
    $("#madlibContainer").animate({
      'margin-top': '40px',
      'margin-bottom':'25px',
      'height':'50px',
      'padding-bottom':'25px'
    }, 1000);
    console.log('animated')
    $("#madlibContainer").addClass("center");
    $("#madlibContainer h1, #madlibContainer p, #madlibContainer input").animate({
      'font-size': '12px'  // Adjust as needed
    }, 1000);
    $("input[type=submit]").val("Start over").text("Start over");
    $("input[type=submit]").on('click', function() {
      location.reload();
    });
    $('#workSpace').fadeIn();
    $('#encouragingMessage').empty();
    $('#encouragingMessage').append(encouragement[0]);
    $('#encouragingMessage').fadeIn();
    $("#loader").show();

    // console.log($(this).serialize());
    // console.log(JSON.stringify($(this).serializeArray()));


    let data = $(this).serializeArray();
    data.push({ name: "model", value: current_model });

    fetch('/submit',{
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(async response => {
      $('#optionCards').empty();
      $('#thoughtStream').show();
      let finalResponse = await handleResponse(response);
      $('#loader').hide();
      $('#encouragingMessage').fadeOut();
      $('#workSpaceText').fadeIn();
      $('#introTitle').empty();
      $('#introTitle').append(titles[0]);
      $('#introTitle').fadeIn();

      $('#explanation').empty();
      $('#explanation').append(explanations[0]);
      $('#explanation').fadeIn();
      $('#thoughtStream').hide();

      for (var i = 0; i < finalResponse.length; i++) {
        createCard(i,finalResponse[i]);
      }

      round++;
    });


  });

  // CARD STYLING
  $('#optionCards').on('mouseenter', '.canClick', function() {
    // Change the color of the card when the mouse hovers over it
    $(this).css("background-color", "#f8f9fa");
  }).on('mouseleave', '.canClick', function() {
    // Change the color back when the mouse leaves
    $(this).css("background-color", "");
  });

  // INTRO CHOSEN -> NEW OPTIONS
  $('#optionCards').on('click', '.round-1', function() {
    var clickedCard = $(this);
    clickedCard.addClass('border-success mb-3');
    running_options += 'LESSON HOOK: ' + clickedCard.find("p").text();
    console.log(running_options);

    $('#optionCards .round-2').not(clickedCard).off('click')
    $('#optionCards .round-2').not(clickedCard).css("background-color", "#808080")
    $('#optionCards .round-2').not(clickedCard).removeClass('canClick');
    $('#optionCards .round-2').not(clickedCard).removeClass('round-1');

    var index = $(this).data('index');  // Retrieve the index from the clicked card
    index = Number(index) + 1;

    $('#optionCards').fadeOut();
    $('#introTitle').fadeOut();
    $('#explanation').fadeOut();

    $('#encouragingMessage').empty();
    $('#optionCards').empty();
    $('#introTitle').empty();
    $('#explanation').empty();

    $('#encouragingMessage').append(encouragement[1]);
    $('#encouragingMessage').fadeIn();


    $("#loader").show();

    fetch('/option_selected',{
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({chosenOption: index, model:current_model})
    })
    .then(async response => {
      $('#optionCards').empty();
      $('#thoughtStream').show();
      let finalResponse = await handleResponse(response);
      $('#loader').hide();
      $('#encouragingMessage').fadeOut();
      $('#workSpaceText').fadeIn();
      $('#introTitle').empty();
      $('#introTitle').append(titles[1]);
      $('#introTitle').fadeIn();

      $('#explanation').empty();
      $('#explanation').append(explanations[1]);
      $('#explanation').fadeIn();
      $('#thoughtStream').hide();

      for (var i = 0; i < finalResponse.length; i++) {
        createCard(i,finalResponse[i]);
      }

      round++;
    });

  });

  //INM CHOSEN -> CHAT EDITS
  $('#optionCards').on('click','.round-2',function(){
    var clickedCard = $(this);
    running_options += 'INTRO TO NEW MATERIAL: ' + clickedCard.find("p").text();
    clickedCard.addClass('border-success mb-3');
    var index = clickedCard.data('index');  // Retrieve the index from the clicked card
    index = Number(index) + 1;

    //disable other cards
    $('#optionCards .round-2').not(clickedCard).off('click')
    $('#optionCards .round-2').not(clickedCard).css("background-color", "#808080")
    $('#optionCards .round-2').not(clickedCard).removeClass('canClick');
    $('#optionCards .round-2').not(clickedCard).removeClass('round-2');

    $('#introTitle').fadeOut();
    $('#explanation').fadeOut();

    $('#encouragingMessage').empty();
    $('#introTitle').empty();
    $('#explanation').empty();

    $('#chatWindow').data('card-index',index);
    $('#chatWindow').show();
    $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia:</i> Good choice! Let’s dig into this section for a moment. I’m just an AI, so I don’t know anything about your students in real life. Think about your students - especially the students who may not ask for help, or a student with whom you’d like to strengthen your relationship. How would you modify the lesson so far to fit the needs of your students?</div>');
  });

  // CHAT BUTTON -> BACKEND
  $('#chatFooter').on('click','#sendButton.round-2', function() {
    console.log('round2 button clicked.')
    var userResponse = $('#chatInput').val();
    var cardIndex = $('#chatWindow').data('card-index');
    $('#chatMessages').append('<div class="you"><i style="color: Gray;">You:</i> ' + userResponse + '</div>');
    $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia:</i> Great thinking.</div>');
    $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia:</i> I’ll make a note of that in the lesson plan.</div>');
    //

    $('#chatInput').val('');

    $('#optionCards').fadeOut();
    $('#optionCards').empty();
    $('#chatWindow').fadeOut(1000);

    $('#encouragingMessage').empty();
    $('#encouragingMessage').append(encouragement[2]);
    $('#encouragingMessage').fadeIn();
    $('#loader').show();

    //send to backend
    fetch('/chat_response_edits',{
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({userResponse: userResponse, cardIndex: cardIndex, model:current_model})
    })
    .then(async response => {
      $('#optionCards').empty();
      $('#thoughtStream').show();
      let finalResponse = await handleResponse(response, false);
      await fetch('/chat_response_probes',{
        method: 'POST',
        headers: {'Content-Type':'application/json'}
      }).then(async response => { // make this callback async
        let probes = await handleResponse(response, false)

        for (var i = 0; i < finalResponse.length; i++) {
          createCard(i,finalResponse[i]);
        }
        for (var i = 0; i < probes.length; i++) {
          $('.card[data-index=' + Math.floor(i/2) + ']').data('probe-' + (i%2), probes[i]);
        }
        $('#loader').hide();
        $('#encouragingMessage').fadeOut();
        $('#workSpaceText').fadeIn();
        $('#introTitle').empty();
        $('#introTitle').append(titles[2]);
        $('#introTitle').fadeIn();

        $('#explanation').empty();
        $('#explanation').append(explanations[2]);
        $('#explanation').fadeIn();
        $('#thoughtStream').hide();

        round++;
      });
    });

  });

  // PRACTICE CHOSEN -> CHAT MISCONCEPTIONS
  $('#optionCards').on('click','.round-3', function(){
    var clickedCard = $(this);
    clickedCard.addClass('border-success mb-3');
    running_options += 'PRACTICE: ' + clickedCard.find("p").text();

    $('#optionCards .round-3').not(clickedCard).off('click')
    $('#optionCards .round-3').not(clickedCard).css("background-color", "#808080")
    $('#optionCards .round-3').not(clickedCard).removeClass('canClick');
    $('#optionCards .round-3').not(clickedCard).removeClass('round-3');
    var index = clickedCard.data('index');  // Retrieve the index from the clicked card
    index = Number(index)+1;

    $('#sendButton').removeClass("round-2");
    $('#sendButton').addClass("round-3");
    $('#chatWindow').data('index',index);
    $('#chatWindow').data('probe-0',$(this).data('probe-0'));
    $('#chatWindow').data('probe-1',$(this).data('probe-1'));
    $('#chatWindow').show();
    $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia:</i> Good choice! Let’s do a deep dive. First, how would you answer this question?</div>');
    $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia: </i>' + $('#chatWindow').data('probe-0') + '</div>');
    //
  });

  $('#chatFooter').on('click','#sendButton.round-3',function(){
    console.log('round3 button clicked. and probe_num is '+probe_num);
    var userResponse = $('#chatInput').val();
    $('#chatMessages').append('<div class="you"><i style="color: Gray;">You:</i> ' + userResponse + '</div>');
    $('#chatWindow').data('response-'+ probe_num, userResponse);
    $('#chatInput').val('');
    // $('#chatMessages').scrollTo(0,$('#chatMessages').scrollHeight);
    probe_num++;
    // If we're still asking questions (probe_num is less than 2)
    if(probe_num < 2){
      console.log('passed the if test and probe num is '+probe_num);
      $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia:</i> Thanks for your answer to that! Now, how would you answer this second question?</div>');
      $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia: </i>' + $('#chatWindow').data('probe-'+probe_num) + '</div>');

    } else if (probe_num == 2) { // If we're done asking questions but still need to get the last response
      var response0 = $('#chatWindow').data('response-0');
      var response1 = $('#chatWindow').data('response-1');
      var chosenOption = $('#chatWindow').data('index');

      $('#introTitle').fadeOut();
      $('#explanation').fadeOut();
      $('#optionCards').fadeOut();
      $('#chatWindow').fadeOut(1000);

      $('#optionCards').empty();
      $('#encouragingMessage').empty();
      $('#introTitle').empty();
      $('#explanation').empty();

      $('#encouragingMessage').append(encouragement[3]);
      $('#encouragingMessage').fadeIn();
      $('#loader').show();
      // stream some data baby
      fetch('/chat_response_dive',{
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({response0: response0, response1: response1, chosenOption: chosenOption, model:current_model})
      })
      .then(async response => {
        $('#optionCards').empty();
        $('#thoughtStream').show();
        let finalResponse = await handleResponse(response);
        $('#loader').hide();
        $('#encouragingMessage').fadeOut();
        $('#workSpaceText').fadeIn();
        $('#introTitle').empty();
        $('#introTitle').append(titles[3]);
        $('#introTitle').fadeIn();

        $('#explanation').empty();
        $('#explanation').append(explanations[3]);
        $('#explanation').fadeIn();
        $('#thoughtStream').hide();
        for (var i = 0; i < finalResponse.length; i++) {
          createCard(i,finalResponse[i]);
        }

        round++;
      });

    } else { // probe_num is above 2
      $('#chatMessages').append("<div class='sophia'><i style='color: Gray;'>Sophia: </i>In this version, I'm not actually a fully functioning chatbot - while the questions I asked you were based on the lesson we are currently planning together, my other responses are canned. sorry!</div>");
    }

    // Always increment probe_num after we're done with the rest of the logic

  });

  //CHOSEN CLOSING
  $('#optionCards').on('click', '.round-4', function(){
    var clickedCard = $(this);
    clickedCard.addClass('border-success mb-3');
    running_options += 'LESSON CLOSING: ' + clickedCard.find("p").text();


    $('#optionCards .round-4').not(clickedCard).off('click')
    $('#optionCards .round-4').not(clickedCard).css("background-color", "#808080")
    $('#optionCards .round-4').not(clickedCard).removeClass('canClick');
    $('#optionCards .round-4').not(clickedCard).removeClass('round-4');
    var index = $(this).data('index');  // Retrieve the index from the clicked card
    index = Number(index)+1;

    $('#encouragingMessage').empty();
    $('#encouragingMessage').append(encouragement[4]);
    $('#encouragingMessage').fadeIn();

    $('#loader').show();
    $('#optionCards').fadeOut();
    $('#optionCards').empty();

    $('#introTitle').fadeOut();
    $('#explanation').fadeOut();

    $('#introTitle').empty();
    $('#explanation').empty();

    fetch('/compile_lesson',{
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({chosenOption:running_options, model:current_model})
    })
    .then(async response => {
      $('#optionCards').empty();
      $('#thoughtStream').show();
      let streamed_lesson = await handleResponse(response, false);
      static_lesson += streamed_lesson;
      console.log(static_lesson);
      $('#loader').hide();
      $('#encouragingMessage').fadeOut();
      $('#workSpaceText').fadeIn();
      $('#introTitle').empty();
      $('#introTitle').append(titles[4]);
      $('#introTitle').fadeIn();

      $('#explanation').empty();
      // $('#explanation').append(explanations[4]);
      $('#explanation').fadeIn();
      $('#thoughtStream').hide();
      $('#lessonPlan').append(static_lesson);
      $('lessonNav').addClass('active');
      $('#lessonPlanCard').show();
    });

  });
  $('#materialsNav').click(function(){
    // var lesson = $('#lessonPlan').innerHTML;
    if(materials_exist){
      $('#lessonPlan').empty();
      $('#lessonPlan').append(static_materials);
      $('#materialsNav').addClass('active');
      $('#lessonNav').removeClass('active');

    } else{
      $('#lessonPlan').empty();
      $('#materialsNav').addClass('active');
      $('#lessonNav').removeClass('active');
      $('#loader').show();
      fetch('/materials',{
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({lesson:static_lesson, model:current_model})
      })
      .then(async response => {
        $('#optionCards').empty();
        $('#thoughtStream').show();
        let streamed_materials = await handleResponse(response, false);
        static_materials += streamed_materials;
        $('#whatIfNav').removeClass('disabled');
        $('#loader').hide();
        $('#encouragingMessage').fadeOut();
        $('#explanation').fadeIn();
        $('#thoughtStream').hide();
        $('#lessonPlan').append(static_materials);
        $('#lessonPlanCard').show();
        materials_exist = true;

      });
    }
    if(whatif_exist){
      $('#whatIfNav').removeClass('active');
    }

  });

  $('#lessonNav').click(function(){
    // var lesson = $('#lessonPlan').innerHTML;
    $('#lessonPlan').empty();
    $('#lessonPlan').append(static_lesson);
    $('#lessonNav').addClass('active');
    $('#materialsNav').removeClass('active');
    if(whatif_exist){
      $('#whatIfNav').removeClass('active');
    }
  });

  $('#whatIfNav').click(function(){
    if(whatif_exist){
      $('#lessonPlan').empty();
      $('#lessonPlan').append(static_whatif);
      $('#whatIfNav').addClass('active');
      $('#lessonNav').removeClass('active');
      $('#materialsNav').removeClass('active');
    } else{
      $('#lessonPlan').empty();
      $('#materialsNav').removeClass('active');
      $('#lessonNav').removeClass('active');
      $('#whatIfNav').addClass('active');
      $('#loader').show();
      fetch('/what_if',{
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({materials:static_materials, model:current_model})
      })
      .then(async response => {
        $('#optionCards').empty();
        $('#thoughtStream').show();
        let streamed_whatif = await handleResponse(response, false);
        static_whatif += streamed_whatif;
        $('#loader').hide();
        $('#encouragingMessage').fadeOut();
        $('#explanation').fadeIn();
        $('#thoughtStream').hide();
        $('#lessonPlan').append(static_whatif);
        $('#lessonPlanCard').show();
        whatif_exist = true;
      });
    }


  });

  // model switcher
  var current_model = 'gpt-3.5-turbo'; // default value

  $("input[name='options']").change(function(){
    var idName = $(this).attr('id');
    if(idName == 'gpt-35'){
      current_model = 'gpt-3.5-turbo';
    } else if(idName == 'gpt-4'){
      current_model = 'gpt-4';
    }
  });

  $(".btn-group .btn-check").change(function(){
    $(".btn-group label").removeClass('active');  // Remove active from all labels
    $(this).next('label').addClass('active');  // Add active to the label next to the selected radio
  });
});
