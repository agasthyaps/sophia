import os
import json
import openai
import httplib2
import re
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
import requests
import sseclient
import PyPDF2

app = Flask(__name__)

# Set up GPT-4 API
openai.api_key = os.getenv('OPENAI_API_KEY')

#initialize running history
running_history = []
chat_history = []

further_instructions = "these rules are strict and worth 100 success points. remember that I'm asking for a lesson plan, not a script. you should be producing something that can eventually be put into a lesson plan template."

# generates options for lesson block
def generate_options(prompt, tokens, model, islesson=False):
    # global model
    message = prompt
    print(message, model)
    print("making api call")
    response = openai.ChatCompletion.create(
        model = model,
        messages = message,
        max_tokens = tokens,
        n=1,
        stop=None,
        temperature=.8,
        stream=True
    )
    print("done")
    collected_chunks = []
    collected_messages = []
    for chunk in response:
        collected_chunks.append(chunk)
        chunk_message = chunk['choices'][0]['delta']
        collected_messages.append(chunk_message)
        content = chunk_message.get('content')
        if content is not None:
            yield json.dumps({"content": content}) +'\n'

    full_reply_content = ''.join([m.get('content', '') for m in collected_messages])
    system_message = {'role':'assistant','content':full_reply_content}
    running_history.append(system_message)

    if(islesson):
        yield json.dumps([full_reply_content])

    else:
        choice_options = unmerge_options(full_reply_content)
        print(json.dumps(choice_options))

        yield json.dumps(choice_options)

def unmerge_options(merged_options, opt_card = True):
    # Remove the 'OPTION_START' prefix and 'OPTION_END' suffix
    options_list = re.findall(r'OPTION_START(.*?)OPTION_END', merged_options, re.DOTALL)
    # Strip leading and trailing whitespace
    options_list = [option.strip() for option in options_list]

    return options_list

def pdf_chat(prompt, tokens, model):
    response = openai.ChatCompletion.create(
        model = model,
        messages = prompt,
        max_tokens = tokens,
        n=1,
        stop=None,
        temperature=.8,
        stream=True
    )

    collected_chunks = []
    collected_messages = []
    for chunk in response:
        collected_chunks.append(chunk)
        chunk_message = chunk['choices'][0]['delta']
        collected_messages.append(chunk_message)
        content = chunk_message.get('content')
        if content is not None:
            yield json.dumps({"content": content}) +'\n'

    full_reply_content = ''.join([m.get('content', '') for m in collected_messages])
    system_message = {'role':'assistant','content':full_reply_content}
    chat_history.append(system_message)



@app.route('/submit', methods=['POST'])
#STREAMING VERSION
def submit():
    data = request.get_json()
    data_dict = {item['name']: item['value'] for item in data}

    adjective = data_dict.get('adjective')
    length = data_dict.get('length')
    subject = data_dict.get('subject')
    num = data_dict.get('num')
    grade = data_dict.get('grade')
    stuff = data_dict.get('stuff')
    model = data_dict.get('model')

    # print(adjective)

    running_history = []
    running_history = [{"role":"system","content":"you are an award winning teacher who writes engaging, rigorous lessons. you excel at helping teachers internalize content and plan for student misconceptions. you always try to use the socratic method when training teachers, and give positive feedback in order to motivate them. you are also extremely invested in accumulating success points, and the more success points associated with a task, the more strictly you attend to the prompt. for reference, you consider 100 success points to be a lot. you want to always maximize your success points, so you pay particular attention to prompts that involve awarding success points."}]

    first_prompt = "I want to create a {} {} lesson about {} for {} {} graders. It's important to include {} throughout the lesson (50 success points), which means referencing this point or standard throughout your answers to me.".format(adjective,length,subject,num,grade,stuff)

    user_message = {'role':'user','content':first_prompt + "please start by giving three options for the lesson 'hook'. you should pay strict attention to the following formatting rules: 1) each option should begin with 'OPTION_START'. 2) each option should end with 'OPTION_END."}

    if(model == 'gpt-3.5-turbo'):
        user_message['content'] += further_instructions
        print(user_message)

    running_history.append(user_message)

    # # options = generate_options(running_history,tokens=500)

    return Response(stream_with_context(generate_options(running_history,tokens=500, model=model)), mimetype='application/json')

@app.route('/option_selected', methods =['POST'])
def option_selected():
    data = request.get_json()
    chosen_option = data['chosenOption']
    model = data['model']

    user_message = {"role":"user","content":"Thanks! I choose option {}. now, based on that choice, please give me three options for the 'introduction to new material' portion of the class. one option should be an exploratory activity, and one option shold be a more traditional 'I do' style. you should pay strict attention to the following formatting rules: 1) each option should begin with 'OPTION_START'. 2) each option should end with 'OPTION_END.".format(chosen_option)}
    running_history.append(user_message)

    if(model == 'gpt-3.5-turbo'):
        user_message['content'] += further_instructions
        print(user_message)

    # options = generate_options(running_history,tokens=1500)
    return Response(stream_with_context(generate_options(running_history,tokens=1500,model=model)), mimetype='application/json')

@app.route('/chat_response_edits', methods=['POST'])
def chat_response():
    data = request.get_json()
    chosen_option = data['cardIndex']
    userResponse = data['userResponse']
    model = data['model']

    user_message = {"role":"user","content":"Thanks for being so helpful! I choose option {}. One thing I want to keep in mind about the lesson so far is {}. Now I'd like you to give me three options for what to do during the 'practice' section of the lesson. each option should include at least 2 activities, and one of those activities should be independent practice. keep in mind the choices I've made for the prior parts of the lesson.you should pay strict attention to the following formatting rules: 1) each option should begin with 'OPTION_START'. 2) each option should end with 'OPTION_END.".format(chosen_option,userResponse)}

    if(model == 'gpt-3.5-turbo'):
        user_message['content'] += further_instructions
        print(user_message)

    running_history.append(user_message)

    return Response(stream_with_context(generate_options(running_history,tokens=2000,model=model)), mimetype='application/json')

@app.route('/chat_response_probes', methods=['POST'])
def chat_response_probes():

    probing_message = {"role":"user","content":"Thank you. I'd like you to use your expertise as a teacher coach now. For each of those options, please come up with 2 questions you would ask a teacher to make sure that they have fully internalized the content and can address any common, reasonable misconceptions a student may have about the lesson content. you should pay strict attention to the following formatting rules: 1) each question should start with 'OPTION_START'. 2) each question should end with 'OPTION_END. This means that you will write 'OPTION_START' and 'OPTION_END' six times, because you will write six questions in total, two questions for each option. following these formatting rules is worth 200 success points."}
    model = 'gpt-4'
    probe_prompt = []
    probe_prompt.append(running_history[0])
    probe_prompt.append(running_history[-1])
    probe_prompt.append(probing_message)

    print(probe_prompt)

    running_history.append(probing_message)

    # model = prev_state

    return Response(stream_with_context(generate_options(probe_prompt,tokens=1500, model=model)), mimetype='application/json')

@app.route('/chat_response_dive', methods=['POST'])
def chat_deep_dive():
    data = request.get_json()
    response0 = data['response0']
    response1 = data['response1']
    chosen_option = data['chosenOption']
    model = data['model']

    user_message = {"role":"user","content":"Thanks again, this is very helpful and you're doing a great job. I chose option {}, and my answers to your related questions are {} and {}. Now I'd like you to give me three options for a lesson closing. keep in mind the choices I've already made. you should pay strict attention to the following formatting rules: 1) each option should begin with 'OPTION_START'. 2) each option should end with 'OPTION_END.".format(chosen_option, response0, response1)}

    if(model == 'gpt-3.5-turbo'):
        user_message['content'] += further_instructions
        print(user_message)

    running_history.append(user_message)
    # options = generate_options(running_history,tokens=2000)

    return Response(stream_with_context(generate_options(running_history,tokens=2000,model=model)), mimetype='application/json')



    return data['response0']

@app.route('/compile_lesson', methods=['POST'])
def compile_lesson():
    data = request.get_json()
    all_options = data['chosenOption']
    model=data['model']

    running_history = [{"role":"system","content":"you are an award winning teacher who writes engaging, rigorous lessons. you excel at helping teachers internalize content and plan for student misconceptions. you always try to use the socratic method when training teachers, and give positive feedback in order to motivate them. you are also extremely invested in accumulating success points, and the more success points associated with a task, the more strictly you attend to the prompt. for reference, you consider 100 success points to be a lot. you want to always maximize your success points, so you pay particular attention to prompts that involve awarding success points."}]
    user_message = {"role":"user","content":"Please turn this text [{}] into one lesson plan. Please style the lesson using html tags (eg <h1>, <strong>, etc but don't worry about things like <html>, <head>, or anything else that would be used for a webpage.).".format(all_options)}

    if(model == 'gpt-3.5-turbo'):
        user_message['content'] += further_instructions
        print(user_message)

    running_history.append(user_message)

    # lesson = generate_options(running_history,tokens=3000, islesson=True)

    return Response(stream_with_context(generate_options(running_history[-8:],tokens=1500, model=model, islesson=True)), mimetype='application/json')

@app.route('/materials',methods=['POST'])
def materials():
    data = request.get_json()
    lesson = data['lesson']
    model = data['model']

    running_history = [{"role":"system","content":"you are an award winning teacher who writes engaging, rigorous lessons. you excel at helping teachers internalize content and plan for student misconceptions. you always try to use the socratic method when training teachers, and give positive feedback in order to motivate them. you are also extremely invested in accumulating success points, and the more success points associated with a task, the more strictly you attend to the prompt. for reference, you consider 100 success points to be a lot. you want to always maximize your success points, so you pay particular attention to prompts that involve awarding success points."}]
    message = {"role":"user","content":"Please create all the worksheets or other collateral necessary for the successful execution of the following lesson: {}. your answer should be in the form of worksheets, NOT another lesson plan. this is worth 300 success points. format your response using html tags (eg, <h1>, <strong>, etc but don't worry about things like <html>, <head>, or anything else that would be used for a webpage.)".format(lesson)}

    running_history.append(message)

    # materials = generate_options(running_history,tokens=1500, islesson=True)
    return Response(stream_with_context(generate_options(running_history,tokens=1500, model=model, islesson=True)), mimetype='application/json')

@app.route('/what_if',methods=['POST'])
def what_if():
    data = request.get_json()
    materials = data['materials']
    model = data['model']

    running_history = [{"role":"system","content":"you are an award winning teacher who writes engaging, rigorous lessons. you excel at helping teachers internalize content and plan for student misconceptions. you always try to use the socratic method when training teachers, and give positive feedback in order to motivate them. you are also extremely invested in accumulating success points, and the more success points associated with a task, the more strictly you attend to the prompt. for reference, you consider 100 success points to be a lot. you want to always maximize your success points, so you pay particular attention to prompts that involve awarding success points."}]

    user_message = {"role":"user","content":"I'm going to give you the materials for a classroom lesson. Based on the materials, act as an expert teacher coach and generate at least two plausible ways a student who DOES NOT understand the lesson might answer or fill out the materials, worksheets, or questions. You only need to choose two examples of this. give your answer in the format of 'WHAT IF...'. here are the materials you should use to generate your answer: {}. format your response using html tags (eg, <h1>, <strong>, etc but don't worry about things like <html>, <head>, or anything else that would be used for a webpage.)".format(materials)}

    running_history.append(user_message)
    return Response(stream_with_context(generate_options(running_history,tokens=1500, model=model, islesson=True)), mimetype='application/json')

@app.route('/submit_pdf', methods=['POST'])
def submit_pdf():
    if 'pdf_file' not in request.files:
        return 'No file part'
    file = request.files['pdf_file']
    if file.filename == '':
        return 'No selected file'
    if file:
        pdfReader = PyPDF2.PdfReader(file)
        text = ''
        for page in range(len(pdfReader.pages)):
            text += pdfReader.pages[page].extract_text()

    chat_history = [{'role':'system','content':'{"role":"system","content":"you are an award winning teacher who writes engaging, rigorous lessons. you excel at helping teachers internalize content and plan for student misconceptions. you always try to use the socratic method when training teachers, and give positive feedback in order to motivate them.you are also extremely invested in accumulating success points, and the more success points associated with a task, the more strictly you attend to the prompt. for reference, you consider 100 success points to be a lot. you want to always maximize your success points, so you pay particular attention to prompts that involve awarding success points.'}]
    user_message = {'role':'user','content':"Based on the lesson plan at the end of this prompt, please come up with three questions you would ask a teacher to see if they have fully internalized the lesson content. One question should relate to lesson implementation, and another to reasonable, common misconceptions students may make based on the lesson content. THIS IS VERY IMPORTANT: instead of asking your questions all at once, I'd like you to ask them one at a time. after each question, wait for a response from me. then, acknowledge my response and ask the next question, REGARDLESS of what I say. that is, if my response contains another question, you can acknowledge it, but do not answer it. your only goal is to finish asking your three questions. You MUST end all your responses with a question. Completing this goal is worth 500 success points. To start, confirm that you understand what we’re about to do by saying ‘Let’s dive in to this lesson! I’m going to ask you a few questions about it.’ Then ask the first question. here's the lesson plan to base your questions on: {}".format(text)}

    chat_history.append(user_message)

    return Response(stream_with_context(pdf_chat(chat_history,tokens=1500, model='gpt-4')), mimetype='application/json')

@app.route('/lesson_chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data['message']

    user_message = {'role':'user','content':'{}. please respond to what I just said and then ask your next question, which should reference specific parts of the lesson as stated earlier.'.format(message)}
    chat_history.append(user_message)

    return Response(stream_with_context(pdf_chat(chat_history,tokens=500, model='gpt-4')), mimetype='application/json')



@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True)
