// Mock for @google/genai
class GoogleGenAI {
  constructor() {
    this.models = {
      generateContent: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          overallScore: 85,
          overallGrade: "A-",
          evaluations: [
            {
              category: "Content Quality",
              score: 85,
              maxScore: 100,
              feedback: "Good understanding",
              strengths: ["Clear explanations", "Good examples"],
              improvements: ["Add more details"],
            },
          ],
          summary: "Good interview performance",
          recommendations: ["Keep practicing"],
        }),
      }),
    };
  }
}

const generateContent = jest.fn().mockResolvedValue({
  text: "Mocked AI response",
});

module.exports = {
  GoogleGenAI,
};
