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
var subject = "";

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

function handleChatResponse(response, elementID) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  var sentence = "";

  // Create a new div for Sophia's message with an inner span for the text
  var messageDiv = $("<div class='sophia'><i style='color: Gray;'>Sophia: </i><span></span></div>");
  $(elementID).append(messageDiv); // use parameter here instead of #pdfChatMessages

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
      $(elementID).scrollTop($(elementID)[0].scrollHeight);
      sentence = "";
      return streamData();
    });
  }

  return streamData();
}



function handleResponse(response, card=true) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  var idx_counter = 0;
  var sentence = "";
  var response_catcher = [];

  function streamData() {
    return reader.read().then(({done, value}) => {

      $('#thoughts').fadeOut(3000, function(){
        $('#thoughts').empty();
      });

      if (done) {
        console.log("done");
        console.log(response_catcher)
        const finalResponse = response_catcher[response_catcher.length - 1];

        return finalResponse;
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

      return streamData();
    });
  }
  return streamData();
}

function showPDF(pdf_url) {
    // The workerSrc property shall be specified.
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

    // Asynchronous download PDF as an ArrayBuffer
    var loadingTask = pdfjsLib.getDocument(pdf_url);
    loadingTask.promise.then(function(pdf) {
        console.log('PDF loaded');

        // Fetch the first page
        var pageNumber = 1;
        pdf.getPage(pageNumber).then(function(page) {
            console.log('Page loaded');

            var scale = .85;
            var viewport = page.getViewport({ scale: scale });

            // Prepare canvas using PDF page dimensions
            var canvas = document.getElementById('pdf-canvas');
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);
            renderTask.promise.then(function() {
                console.log('Page rendered');
            });
        });
    }, function(reason) {
        console.error(reason);
    });
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
  var pdf_mode = false;
  $("#upload_link").click(function(e) {
    e.preventDefault();
    if(pdf_mode){
      location.reload();
    } else {
      $('#madlibContainer').css("display", "none");
      $('#madlibContainer').css("height", "10px");
      $('#madlibContainer').hide();
      $('#madlibContainer').children().hide();
      $("#chooseFile").show();
      pdf_mode = true;
    }

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

    var file = $('#file_upload')[0].files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        // e.target.result contains the data as a URL representing the file's data as a base64 encoded string
        showPDF(e.target.result);
    };
    reader.readAsDataURL(file);

    var formData = new FormData();
    formData.append('pdf_file', $('#file_upload')[0].files[0]);
    //idk which of these three is actually doing it but for some reason
    // I couldnt get #madlibcontainer to disappear
    $('#madlibContainer').css("display", "none");
    $('#madlibContainer').hide();
    $('#madlibContainer').children().hide();
    $('#workSpace').css('padding','20px');
    $('#pdfForm').css('padding','15px');
    $('#upload_link').empty();
    $('#upload_link').append('start over');
    $('#chooseFile').hide();
    $('#uploadBtn').hide();
    $('#pdfChatWindow').show();
    $('#workSpaceText').show();
    $('#introTitle').empty();
    $('#introTitle').append(titles[5]);
    $('#introTitle').show();
    $('#explanation').empty();
    $('#explanation').append(explanations[5]);
    $('#explanation').show();

    fetch('/submit_pdf', {
      method: 'POST',
      body: formData
    }).then(async response => {
      if (response.ok) {
        handleChatResponse(response,'#pdfChatMessages');
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
          await handleChatResponse(response, '#pdfChatMessages');
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
    subject = $('#subject').val();
    $('#pdfForm').hide();
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
    // "im just an ai so..."
    fetch('/activate_lesson_chat',{
      method: 'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body: JSON.stringify({running: running_options, subject:subject, stage:"0"})
    }).then(async response => {
      $('#chatWindow').show();
      handleChatResponse(response,'#chatMessages');
    });

    $('#chatWindow').data('card-index',index);
    // $('#chatMessages').append('<div class="sophia"><i style="color: Gray;">Sophia:</i> Good choice! Let’s dig into this section for a moment. I’m just an AI, so I don’t know anything about your students in real life. Think about your students - especially the students who may not ask for help, or a student with whom you’d like to strengthen your relationship. How would you modify the lesson so far to fit the needs of your students?</div>');
  });

  // chat about the first two choices you've made, but only two exchanges.
  var chat_num = 0;
  $('#chatFooter').on('click','#sendButton.round-2', function() {

    console.log('round2 button clicked.')
    var userMessage = $('#chatInput').val();
    // keep chatting if we've had less than two answers from users
    if(chat_num < 2){
      if (userMessage){
        chat_num++;
        $('#chatMessages').append("<div class='you'><i style='color: Gray;'>You: </i>" + userMessage + "</div>");
        $('#chatInput').val(""); //clear input field after submitting response

        $("#sendButton.round-2").prop("disabled", true);

        fetch('/lesson_chat',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({message: userMessage, chat_num:chat_num})
        }).then(async response =>{
          if (response.ok) {
            await handleChatResponse(response, '#chatMessages');
            $("#sendButton.round-2").prop("disabled", false);
          } else {
            throw new Error("Error: " + response.statusText);
          }
        });
      }
    } else {
      // if we've chatted enough (2 exchanges), then move to next stage
      var cardIndex = $('#chatWindow').data('card-index');
      $('#chatInput').val('');

      $('#optionCards').fadeOut();
      $('#optionCards').empty();
      $('#chatWindow').fadeOut(1000);

      $('#encouragingMessage').empty();
      $('#encouragingMessage').append(encouragement[2]);
      $('#encouragingMessage').fadeIn();
      $('#loader').show();

      // create options for activities/practice
      fetch('/chat_response_edits',{
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({userResponse: userMessage, cardIndex: cardIndex, model:current_model})
      })
      .then(async response => {
        $('#optionCards').empty();
        $('#thoughtStream').show();
        let finalResponse = await handleResponse(response, false);
        for (var i = 0; i < finalResponse.length; i++) {
          createCard(i,finalResponse[i]);
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
        console.log("ACTIVITIES, ROUND 3:" + round);

      });
    }
  });


  // User chooses option for practice, which triggers chat to open again.
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
    $('#chatWindow').data('index',index); //important for sending info back to server
    fetch('/activate_lesson_chat',{
      method: 'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body: JSON.stringify({running: running_options, subject:subject, stage:"1"})
    }).then(async response => {
      $('#chatWindow').show();
      //reset chat number counter so we can end chat after set number of interactions
      chat_num = 0;
      handleChatResponse(response,'#chatMessages');
    });

  });

  $('#chatFooter').on('click','#sendButton.round-3',function(){
    console.log('round3 button clicked. and probe_num is '+probe_num);
    var userMessage = $('#chatInput').val();
    if(chat_num < 2){
      if (userMessage){
        $('#chatWindow').data('response-'+ chat_num, userMessage);
        $('#chatMessages').append("<div class='you'><i style='color: Gray;'>You: </i>" + userMessage + "</div>");
        $('#chatInput').val(""); //clear input field after submitting response
        chat_num++;

        $("#sendButton.round-3").prop("disabled", true);

        fetch('/lesson_chat',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({message: userMessage, chat_num:chat_num})
        }).then(async response =>{
          if (response.ok) {
            await handleChatResponse(response, '#chatMessages');
            $("#sendButton.round-3").prop("disabled", false);
          } else {
            throw new Error("Error: " + response.statusText);
          }
        });
      }

    }
    // we've talked enough, now move to next stage
    else {
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
      // generate closing options
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
    }

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
