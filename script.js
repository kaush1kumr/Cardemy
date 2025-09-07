/*
 * Cardemy - Final Client-Side Logic
 * Handles chat UI, API calls, and carousel rendering.
 */
'use strict';

// 1. --- SELECT THE KEY DOM ELEMENTS ---
const chatForm = document.querySelector('.input-area');
const userInputField = document.getElementById('user-input');
const chatWindow = document.querySelector('.chat-window');
const initialGreeting = document.querySelector('.initial-greeting-container');

// Flag to track if this is the first message (to hide the greeting)
let isFirstMessage = true;

// 2. --- ADD THE FORM EVENT LISTENER ---
chatForm.addEventListener('submit', handleMessageSubmit);


/**
 * 3. --- CORE FUNCTION: handleMessageSubmit ---
 * (UPDATED to send the selected learning mode)
 */
function handleMessageSubmit(event) {
    event.preventDefault(); // Stop the page from reloading
    const messageText = userInputField.value.trim();

    if (messageText === "") {
        return; // Do nothing if input is empty
    }

    // --- NEW LINE ADDED ---
    // Get the value of the currently checked radio button ("revision" or "learning")
    const selectedMode = document.querySelector('input[name="learnMode"]:checked').value;

    // Hide the initial greeting (only on the first message)
    if (isFirstMessage && initialGreeting) {
        initialGreeting.style.display = 'none';
        isFirstMessage = false;
    }

    // Display the user's message in the chat
    displayMessage(messageText, 'user');

    // Send the topic AND the selected mode to the backend
    getBotResponse(messageText, selectedMode);

    // Clear the input field
    userInputField.value = '';
}


/**
 * 4. --- HELPER: displayMessage ---
 * Displays simple text messages (like user messages, errors, or "thinking").
 */
function displayMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    messageElement.classList.add(`${sender}-message`);
    messageElement.textContent = text;
    
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll
}


/**
 * 5. --- HELPER: getBotResponse (Async Fetch Call) ---
 * (UPDATED to accept the 'mode' and send it in the JSON body)
 */
async function getBotResponse(userTopic, mode) { // Added 'mode' parameter
    // Show a "typing" indicator
    displayMessage("...", 'bot-thinking');
    const thinkingMessage = document.querySelector('.bot-thinking');

    const serverURL = 'http://localhost:3000/api/generate-lesson';

    try {
        // Send the topic AND mode to our server
        const response = await fetch(serverURL, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
            },
            // --- UPDATED BODY ---
            // Send both pieces of data in the body
            body: JSON.stringify({ 
                topic: userTopic,
                learnMode: mode  // Add the selected mode
            }) 
        });

        // Remove the "..." thinking message as soon as we get any response
        if (thinkingMessage) {
            thinkingMessage.remove();
        }

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        // Get the JSON data: { cards: [...] }
        const data = await response.json();

        // Check if the AI returned a valid cards array
        if (data.cards && data.cards.length > 0) {
            // This logic is unchanged - our carousel will handle any number of cards
            displayCardCarousel(data.cards);
        } else {
            displayMessage("Sorry, I couldn't generate any flashcards for that topic.", 'bot');
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
        displayMessage("Sorry, I'm having difficulties connecting to my brain. Please try again.", 'bot');
    }
}


/**
 * 6. --- HELPER: displayCardCarousel (Final Version) ---
 * This loops through the AI's cards and builds the interactive "Reels" component.
 */
function displayCardCarousel(cards) {
    let currentCardIndex = 0; // Tracks which card is visible

    // 1. Create the main carousel container
    const carouselContainer = document.createElement('div');
    carouselContainer.classList.add('card-carousel-container');

    // 2. Create the area where cards will live
    const cardView = document.createElement('div');
    cardView.classList.add('card-viewport'); 
    
    // 3. Loop through the AI cards and create the HTML for EACH card
    cards.forEach((cardData, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('carousel-card');
        
        const cardInner = document.createElement('div');
        cardInner.classList.add('card-inner');

        // Create Front Face (NO LABEL) - make it visible by default
        const cardFront = document.createElement('div');
        cardFront.classList.add('card-face', 'card-front', 'is-visible'); // Make front visible
        cardFront.innerHTML = `<p class="card-text">${cardData.front}</p>`;

        // Create Back Face (NO LABEL) - remains hidden
        const cardBack = document.createElement('div');
        cardBack.classList.add('card-face', 'card-back');
        cardBack.innerHTML = `<p class="card-text">${cardData.back}</p>`;

        // Add flip functionality - now toggles visibility explicitly
        cardElement.addEventListener('click', () => {
            cardInner.classList.toggle('is-flipped');
            
            // Explicitly toggle visibility to prevent mirrored text
            if (cardInner.classList.contains('is-flipped')) {
                cardFront.classList.remove('is-visible');
                cardBack.classList.add('is-visible');
            } else {
                cardFront.classList.add('is-visible');
                cardBack.classList.remove('is-visible');
            }
        });

        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        cardElement.appendChild(cardInner);

        // Show the first card, hide the rest
        if (index === 0) {
            cardElement.classList.add('active-card'); 
        }

        cardView.appendChild(cardElement);
    });

    // 4. Create the navigation bar
    const nav = document.createElement('div');
    nav.classList.add('carousel-nav');

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Prev';
    prevButton.disabled = true; // Start at card 0

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    if (cards.length <= 1) {
        nextButton.disabled = true; // Disable if only one card
    }

    const counter = document.createElement('span');
    counter.classList.add('card-counter');
    counter.textContent = `Card ${currentCardIndex + 1} of ${cards.length}`;

    nav.appendChild(prevButton);
    nav.appendChild(counter);
    nav.appendChild(nextButton);

    // We must get this list *after* all cards are added to the cardView
    const allCardInners = cardView.querySelectorAll('.card-inner');
    const allCardFronts = cardView.querySelectorAll('.card-front');
    const allCardBacks = cardView.querySelectorAll('.card-back');

    // 5. Add Click Logic to Nav Buttons (with card reset logic)
    nextButton.addEventListener('click', () => {
        // --- Reset the card we are leaving ---
        allCardInners[currentCardIndex].classList.remove('is-flipped');
        allCardFronts[currentCardIndex].classList.add('is-visible');
        allCardBacks[currentCardIndex].classList.remove('is-visible');
        // --- End Reset ---

        cardView.children[currentCardIndex].classList.remove('active-card'); // Hide old card
        currentCardIndex++;
        cardView.children[currentCardIndex].classList.add('active-card'); // Show new card
        
        counter.textContent = `Card ${currentCardIndex + 1} of ${cards.length}`;
        prevButton.disabled = false;
        if (currentCardIndex === cards.length - 1) {
            nextButton.disabled = true;
        }
    });

    prevButton.addEventListener('click', () => {
        // --- Reset the card we are leaving ---
        allCardInners[currentCardIndex].classList.remove('is-flipped');
        allCardFronts[currentCardIndex].classList.add('is-visible');
        allCardBacks[currentCardIndex].classList.remove('is-visible');
        // --- End Reset ---

        cardView.children[currentCardIndex].classList.remove('active-card'); // Hide old card
        currentCardIndex--;
        cardView.children[currentCardIndex].classList.add('active-card'); // Show new card

        counter.textContent = `Card ${currentCardIndex + 1} of ${cards.length}`;
        nextButton.disabled = false;
        if (currentCardIndex === 0) {
            prevButton.disabled = true;
        }
    });

    // 6. Add the card area AND the nav bar to the main container
    carouselContainer.appendChild(cardView);
    carouselContainer.appendChild(nav);

    // 7. Add the entire new component to the chat window
    chatWindow.appendChild(carouselContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}