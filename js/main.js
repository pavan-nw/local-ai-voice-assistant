let voices = [];
let langauges = ["en-US", "en-GB", "en-IN"]
function populateVoiceList() {
  voices = window.speechSynthesis.getVoices();
  const voiceSelect = document.getElementById('voiceSelect');
  voiceSelect.innerHTML = '';

  voices
  .filter((voice) => langauges.includes(voice.lang))
  .forEach((voice) => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.setAttribute('data-lang', voice.lang);
    option.setAttribute('data-name', voice.name);
    voiceSelect.appendChild(option);
  });
}

// Populate the voice list as soon as the voices are loaded
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

function stopSpeaking() {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel(); // Stop any ongoing speech before starting new one
  }
}

function speakText(text) {
  if (!text) {
    text = "Nothing to speak, enter something in the text area."
  }
  const output = document.getElementById('output');
  stopSpeaking()
  const utterance = new SpeechSynthesisUtterance(text);

  const voiceSelect = document.getElementById('voiceSelect');
  const selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-name');

  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name === selectedOption) {
      utterance.voice = voices[i];
      break;
    }
  }

  // Event handler for when speech synthesis starts
  utterance.onstart = () => {
    console.log("Speech started");
  };

  // Event handler for boundary events (e.g., word boundaries)
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      const spokenText = text.substring(0, event.charIndex);
      output.textContent = spokenText;
    }
  };

  // Event handler for when speech synthesis ends
  utterance.onend = () => {
    output.textContent = text; // Ensure the full text is shown at the end
    console.log("Speech ended");
  };

  window.speechSynthesis.speak(utterance);
}

function startSpeaking() {
  const text = document.getElementById("text").value;
  speakText(text)
}

//   recognition.onresult = (event) => {
//     console.log("onresult");
//     const output = document.getElementById('output');
//     output.textContent = "";
//     // Loop through the results
//     for (let i = event.resultIndex; i < event.results.length; ++i) {
//       // Check if the result is final or interim
//       if (event.results[i].isFinal) {
//         output.textContent += event.results[i][0].transcript + " ";
//       } else {
//         output.textContent += event.results[i][0].transcript;
//       }
//     }
//   };

let recognition;
let finalTranscript = "";

// Function to start recognition
function startRecognition() {
  toggleRecordBtns();
  finalTranscript = "";
  initSpeechRecognition();
  if (recognition) recognition.start();
}

// Function to stop recognition
function stopRecognition() {
  toggleRecordBtns();
  if (recognition) recognition.stop();
}

function toggleRecordBtns() {
  document.getElementById("start-record-btn").classList.toggle("hide");
  document.getElementById("stop-record-btn").classList.toggle("hide");
}

initSpeechRecognition = () => {
  document.getElementById("output").innerHTML = "Your text will appear here...";
  const output = document.getElementById('output');
  const action = document.getElementById('action');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    action.innerHTML = "Listening...";
  }

  recognition.onend = () => {
    console.log("Recognition ended");
    console.log("Final Transcript:", finalTranscript);
    action.innerHTML = "";
    output.innerHTML = finalTranscript;
    if (finalTranscript) {
      sendToAIModel(finalTranscript);
    }
  };

  recognition.onresult = (e) => {
    output.innerHTML = "";
    // Loop through the results from the recognition event
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalTranscript += e.results[i][0].transcript + " "; // Append to final transcript
        output.innerHTML += e.results[i][0].transcript + " ";;
      } else {
        output.innerHTML += e.results[i][0].transcript; // Interim transcript
      }
    }
  }
}


const model1 = "Meta-Llama-3.1-8B-Instruct-GGUF/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"
const model2 = "Codestral-22B-v0.1-GGUF/Codestral-22B-v0.1-Q4_K_M.gguf"
const reqBody = (content) => {
  return {
    "model": "lmstudio-community/" + model1,
    "messages": [
      { "role": "user", "content": content }
    ],
    "temperature": 0.7,
    "max_tokens": -1,
    "stream": false
  }
}


function sendToAIModel(content) {
  document.getElementById("loading-response").classList.remove("hide");
  fetch('http://localhost:1234/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reqBody(content))
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      console.log('Success:', data);
      document.getElementById("loading-response").classList.add("hide");
      if (data.model.includes(model2)) {
        const aiResponse = document.getElementById("ai-response");
        const codeBlock = document.getElementById("code-block");
        codeBlock.classList.remove("hide");
        aiResponse.innerHTML = window.marked.marked(data.choices[0].message.content);
      } else {
        document.getElementById("stop-speaking-response").classList.remove("hide");
        speakText(data.choices[0].message.content);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}
