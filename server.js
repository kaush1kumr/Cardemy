// --- Import Required Packages ---
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); 

// --- Create the Express App ---
const app = express();
const PORT = 3000;

// --- Configure the AI (Gemini) ---
const gemini_api_key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(gemini_api_key);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});

// --- DYNAMIC PROMPT FUNCTION (Replaces the static prompt string) ---
function getSystemPrompt(mode) {
    const baseInstructions = `
      You are "Cardemy," an expert teacher AI. Your job is to take a complex topic 
      and generate simple, clear flashcards. You MUST respond ONLY with JSON. 
      Do not add any text before or after the JSON object.
      The JSON format MUST be an object containing a single key "cards", 
      which is an array of card objects (each with "front" and "back" keys).
    `;

    if (mode === 'learning') {
        // This is the prompt for "Learning (First Time)"
        return baseInstructions + `
          The user is learning this topic for the FIRST TIME. Be extremely thorough.
          Generate a comprehensive deck of 15 to 30 flashcards.
          Cover all foundational concepts, key definitions, important processes, formulas, and key historical examples. 
          Ensure the deck provides a complete and deep understanding of the topic from the ground up.
        `;
    }
    
    // This is the prompt for "Revision" (and the default)
    return baseInstructions + `
      The user wants a quick REVISION of this topic. Be concise and high-level.
      Generate only 5 to 10 essential flashcards.
      Focus ONLY on the absolute most critical keywords, definitions, and core concepts needed for a fast review.
    `;
}

// --- MIDDLEWARE (Order is critical) ---
app.use(cors());       
app.use(express.json());

// 2. express.json(): Parses incoming request bodies as JSON. 
app.use(express.json()); 

// --- ROUTES ---
// (This whole function is REPLACED)
app.post('/api/generate-lesson', async (req, res) => {
    
    // --- UPDATED to receive both variables ---
    const { topic, learnMode } = req.body;
    console.log(`SERVER: Received request for topic: "${topic}", Mode: "${learnMode}"`);

    // --- NEW: Get the dynamic prompt based on the mode ---
    const systemPrompt = getSystemPrompt(learnMode);
    
    try {
        // Start the chat using our new dynamic system prompt
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "OK. I will generate flashcards as requested in the specified mode and JSON format." }] }
            ],
            generationConfig: {
                maxOutputTokens: 8000, // Increased token limit for the larger "learning" mode
                responseMimeType: "application/json", 
            },
        });

        // Send the user's topic to the AI (this logic is the same)
        const result = await chat.sendMessage(topic);
        const aiResponse = result.response;
        const aiResponseText = aiResponse.text();

        console.log("AI Raw Response:", aiResponseText); 

        const aiJson = JSON.parse(aiResponseText);

        // Send the structured data directly to the client (same logic)
        res.json(aiJson); 

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "The AI engine failed to generate a response. Please try again." });
    }
});


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Cardemy server is running and listening on http://localhost:${PORT}`);
});