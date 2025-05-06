// server/services/chatgptService.js
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// A function that sends the "reviewText" to ChatGPT and gets a response
async function generateResponse(reviewText) {
    try {
        // This is a simplified prompt. Refine to your style, language, etc.
        const prompt = `
      The user wrote a hotel review: "${reviewText}".
      Please draft a concise, professional, and empathetic response from the hotel manager’s perspective.
      Be sure to address any concerns in the review.
    `;

        const response = await openai.createChatCompletion({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'user',
                content: prompt
            }],
            temperature: 0.7
        });
        const aiMessage = response.data.choices[0].message.content.trim();
        console.log('>>> Sending to ChatGPT:', reviewText);
        console.log('>>> Response:', response.data.choices[0].message.content);
        return aiMessage;
    } catch (error) {
        console.error('Error in generateResponse:', error);
        throw error;
    }
}

module.exports = {
    generateResponse
};
