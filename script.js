import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";


let gestureRecognizer;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
let videoHeight = "360px";
let videoWidth = "480px";
let handTrackingEnabled = true;

const pingSound = new Audio('https://cdn.glitch.global/ca655731-39f0-485f-b0d4-d31bfea98ca9/ping.mp3?v=1740167112220');
pingSound.load();
let selectionLocked = false;

// Load the GestureRecognizer model
const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: runningMode
  });
};
createGestureRecognizer();

// Webcam continuous hand gesture detection
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

let gestureTimer = null;
let selectedGesture = null;

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

function enableCam() {
  if (!gestureRecognizer) {
    alert("Please wait for gestureRecognizer to load");
    return;
  }

  webcamRunning = !webcamRunning;
  enableWebcamButton.innerText = webcamRunning
    ? "DISABLE PREDICTIONS"
    : "ENABLE PREDICTIONS";

  const spinner = document.getElementById("loadingSpinner");

  if (webcamRunning) {
    spinner.style.display = "block";
    const constraints = { video: true };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata",  () => {
        spinner.style.display = "none";
        // Get the webcam's natural dimensions
        const naturalWidth = video.videoWidth;
        const naturalHeight = video.videoHeight;

        // Update global variables
        videoWidth = naturalWidth + "px";
        videoHeight = naturalHeight + "px";

        // Set the video element's dimensions 
        video.width = naturalWidth;
        video.height = naturalHeight;

        // Set the canvas element's dimensions
        canvasElement.width = naturalWidth;
        canvasElement.height = naturalHeight;

        video.style.width = videoWidth;
        video.style.height = videoHeight;
        canvasElement.style.width = videoWidth;
        canvasElement.style.height = videoHeight;

        predictWebcam();
      });
    });
  }
  else{
    spinner.style.display = "none";
  }
}

let lastVideoTime = -1;
let results = undefined;

async function predictWebcam() {
  if (!handTrackingEnabled){
    return;
  }
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
  }

  const nowInMs = Date.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  const drawingUtils = new DrawingUtils(canvasCtx);

  //setting size for video and canvas
  canvasElement.style.height = videoHeight;
  video.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  video.style.width = videoWidth;

  // landmarks for hands
  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS, 
        {
          color: "#00FF00",
          lineWidth: 5
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#FF0000",
        lineWidth: 2
      });
    }
  }


  //Displaying the gesture results
  canvasCtx.restore();
  if (results.gestures.length > 0) {
    gestureOutput.style.display = "block";
    const categoryName = results.gestures[0][0].categoryName;
    const categoryScore = parseFloat(
      results.gestures[0][0].score * 100
    ).toFixed(0);
    const handedness = results.handednesses[0][0].displayName;
    updateGestureOutput(categoryName,categoryScore);

  } else {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
      button.classList.remove('active');

    });
    
    gestureOutput.style.display = "block";
    gestureOutput.innerHTML = 'Hand Pose: None <br> Confidence: N/A'

    resetSelection();
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }



  function updateGestureOutput(gesture,confidence){
    let gestureOutput = document.getElementById('gesture_output');

    if (selectionLocked) return; 

    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
      button.classList.remove('active');
    });



    let selectedButton = null;
    let selectedButtonText = "";

    switch (gesture){
      case 'Open_Palm':
        gestureOutput.innerHTML = `Hand Pose: Open Palm 🤚<br> Confidence: ${confidence}%`;
        selectedButton = document.getElementById('b1')
        selectedButtonText = "Open Palm 🤚";
        break;
      case 'Closed_Fist':
        gestureOutput.innerHTML = `Hand Pose: Closed Fist ✊<br> Confidence: ${confidence}%`;
        selectedButton =  document.getElementById('b2')
        selectedButtonText = "Closed Fist ✊";
        break;
      case 'Pointing_Up':
        gestureOutput.innerHTML = `Hand Pose: Pointing Up ☝️<br> Confidence: ${confidence}%`;
        selectedButton = document.getElementById('b3')
        selectedButtonText = "Pointing Up ☝️";
        break;
      case 'Thumb_Up':
        gestureOutput.innerHTML = `Hand Pose: Thumb Up 👍<br> Confidence: ${confidence}%`;
        selectedButton = document.getElementById('b4')
        selectedButtonText = "Thumb Up 👍";
        break;
      case 'Victory':
        gestureOutput.innerHTML = `Hand Pose: Peace ✌️<br> Confidence: ${confidence}%`;
        selectedButton = document.getElementById('b5')
        selectedButtonText = "Peace ✌️";
        break;

      default:
        gestureOutput.innerHTML = 'Hand Pose: None <br> Confidence: N/A';
        resetSelection();
        return;
      
    }
    if(selectedButton){
      selectedButton.classList.add("active");
    

    if (selectedGesture !== gesture) {
      selectedGesture = gesture;
  
      if (gestureTimer) clearTimeout(gestureTimer);

      gestureTimer = setTimeout(() => {

        selectedButton.classList.add("selected"); 
        if ('vibrate' in navigator) {
          window.navigator.vibrate(100); 
        }
      
        if (navigator.haptic) {
        navigator.haptic.selection(); 
       }
       pingSound.play().catch((err) => {
        console.error('Error playing sound:', err);
        });
        selectedButton.classList.remove("active");
        document.getElementById("selectionStatus").innerText = `Button Selected: ${selectedButtonText}`;
        selectionStatus.style.transform = "scale(1)";

        document.body.classList.add("ripple-background");

        selectionLocked = true; 

        setTimeout(() => {
          selectedButton.classList.remove("selected");
          selectionLocked = false;
          selectedGesture = null;

          selectionStatus.style.transform = "scale(0)";
          document.body.classList.remove("ripple-background");
        }, 2000);
      }, 2500); 
    }
    }
  }
  function resetSelection() {
    selectedGesture = null;
    selectionLocked = false;
    if (gestureTimer) clearTimeout(gestureTimer);
    
  }
  document.addEventListener('touchstart', function() {
    if (!pingSound) {
      pingSound = new Audio('ping.mp3');
      pingSound.load();
    }
  }, { once: true });
  if (webcamRunning) {    
    window.requestAnimationFrame(predictWebcam);
  }
}
const toggleButton = document.getElementById("toggleButton");
const videoContainer = document.querySelector("#liveView div");
const buttonsContainer = document.querySelector(".buttons");
let buttonsLarge = false;

toggleButton.addEventListener("click", () => {
  buttonsLarge = !buttonsLarge;
  
  if (buttonsLarge) {
    videoContainer.style.display = "none"; // Hide the webcam
    buttonsContainer.classList.add("large-buttons");
    toggleButton.innerText = "NORMAL MODE";
  } else {
    videoContainer.style.display = "block"; // Show the webcam
    buttonsContainer.classList.remove("large-buttons");
    toggleButton.innerText = "LARGE BUTTONS MODE";
  }
});
const touchModeButton = document.getElementById("touchModeButton");
let touchMode = false;

// Toggle Touch Screen Mode
touchModeButton.addEventListener("click", () => {
  touchMode = !touchMode;
  if (touchMode) {
    document.body.classList.add("large-buttons"); 
    videoContainer.style.display = "none"; 
    handTrackingEnabled = false;
    touchModeButton.innerText = "DISABLE TOUCH SCREEN MODE";
    gestureOutput.style.display = "none"
  } else {
    document.body.classList.remove("large-buttons"); 
    videoContainer.style.display = "block"; 
    handTrackingEnabled = true;
    touchModeButton.innerText = "ENABLE TOUCH SCREEN MODE";
    gestureOutput.style.display = "none"
    
    if (webcamRunning) {
      predictWebcam();  
    }
  }
});

// Modify button behavior based on Touch Screen Mode
document.querySelectorAll(".btn").forEach(button => {
  button.addEventListener("click", (event) => {
    if (touchMode) {
      triggerSelection(event.target);
    }
  });
});

function triggerSelection(selectedButton) {
  if (!selectedButton || selectionLocked) return;

  selectedButton.classList.add("active");

  if (gestureTimer) clearTimeout(gestureTimer);

  selectedButton.classList.add("selected");

  if ('vibrate' in navigator) {
    window.navigator.vibrate(100);
  }

  if (navigator.haptic) {
    navigator.haptic.selection();
  }

  pingSound.play().catch((err) => {
    console.error('Error playing sound:', err);
  });

  selectedButton.classList.remove("active");
  document.getElementById("selectionStatus").innerText = `Button Selected: ${selectedButton.innerText}`;
  selectionStatus.style.transform = "scale(1)";
  document.body.classList.add("ripple-background");

  selectionLocked = true;

  setTimeout(() => {
    selectedButton.classList.remove("selected");
    selectionLocked = false;
    selectionStatus.style.transform = "scale(0)";
    document.body.classList.remove("ripple-background");
  }, 2000);
}
