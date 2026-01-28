// services/aiService.js
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const analyzeMatch = async (jobData, userProfile) => {
  try {
    const jobContext = `
      JOB TITLE: ${jobData.title}
      COMPANY: ${jobData.company}
      LEVEL: ${jobData.experienceLevel || "Not specified"}
      EDUCATION: ${jobData.minEducation || "Not specified"}
      KEY SKILLS: ${jobData.skills ? jobData.skills.join(", ") : "-"}
      REQUIREMENTS: ${jobData.requirements ? jobData.requirements.join(", ") : "-"}
      JOB DESCRIPTION: ${jobData.description.replace(/<[^>]*>?/gm, "")} // Hapus tag HTML biar hemat token
    `;

    const userSkills =
      userProfile.profile.skills && Array.isArray(userProfile.profile.skills)
        ? userProfile.profile.skills.join(", ")
        : "-";

    // Pastikan experience ada dan berbentuk array
    const userExperience =
      userProfile.profile.experience &&
      Array.isArray(userProfile.profile.experience)
        ? userProfile.profile.experience
            .map(
              (exp) =>
                `- ${exp.position} at ${exp.company} (${exp.startDate || ""} - ${exp.endDate || "Present"}): ${exp.description || ""}`,
            )
            .join("\n")
        : "No experience listed.";

    // Pastikan education ada dan berbentuk array
    const userEducation =
      userProfile.profile.education &&
      Array.isArray(userProfile.profile.education)
        ? userProfile.profile.education
            .map(
              (edu) =>
                `- ${edu.degree} in ${edu.fieldOfStudy} at ${edu.institution}`,
            )
            .join("\n")
        : "No education listed.";

    const userContext = `
      PROFESSIONAL TITLE: ${userProfile.profile.title || "Not specified"}
      SUMMARY: ${userProfile.profile.summary || "Not specified"}
      SKILLS: ${userSkills}
      
      EXPERIENCE:
      ${userExperience}
      
      EDUCATION:
      ${userEducation}
    `;

    const prompt = `
      Kamu adalah seorang HR Manager dan Pakar ATS (Applicant Tracking System) profesional.
      
      TUGAS:
      Analisis kecocokan antara CV KANDIDAT dengan LOWONGAN PEKERJAAN di bawah ini.
      Gunakan Bahasa Indonesia yang profesional namun tetap mudah dipahami.
      
      ---
      DETAIL LOWONGAN:
      ${jobContext}
      
      ---
      PROFIL KANDIDAT:
      ${userContext}
      
      ---
      INSTRUKSI:
      1. Analisis kecocokan berdasarkan skill, pengalaman, dan persyaratan.
      2. Berikan skor kecocokan dari 0-100.
      3. Tulis ringkasan analisis dalam 2-3 kalimat yang menjelaskan mengapa kandidat cocok/tidak cocok.
      4. Sebutkan 3-5 poin kelebihan kandidat (mengapa cocok untuk posisi ini).
      5. Sebutkan 3-5 poin yang perlu ditingkatkan (area improvement atau skill yang kurang).
      6. Gunakan kalimat yang singkat, padat, dan actionable untuk setiap poin.
      
      OUTPUT harus berupa JSON object dengan struktur berikut:
      {
        "matchScore": number,
        "matchExplanation": "Ringkasan analisis dalam Bahasa Indonesia (2-3 kalimat)",
        "matchingPoints": ["Poin kelebihan 1", "Poin kelebihan 2", ...],
        "missingPoints": ["Area improvement 1", "Area improvement 2", ...]
      }
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      // Force output menjadi JSON agar mudah diolah frontend
      config: { responseMimeType: "application/json" },
    });

    // Parse JSON string dari AI menjadi Object JavaScript
    // console.log(response.text);

    const parsedResult = JSON.parse(response.text);

    // console.log("Parsed AI Result:", parsedResult);

    return parsedResult;
  } catch (error) {
    console.error("Error Gemini AI:", error);
    throw new Error("Gagal melakukan analisis AI");
  }
};

const parseCV = async (cvText) => {
  try {
    const prompt = `
      Act as a Professional Resume Parser.
      Extract information from the RESUME TEXT below and format it into a structured JSON object.

      ---
      RESUME TEXT:
      ${cvText}
      
      ---
      OUTPUT FORMAT (JSON ONLY):
      {
        "fullName": "Name of the candidate",
        "email": "Email address found",
        "profile": {
            "title": "Current Job Title (e.g. Software Engineer)",
            "summary": "A short professional summary (2-3 sentences)",
            "location": "City, Country",
            "skills": ["Skill 1", "Skill 2", "Skill 3"],
            "education": [
                {
                    "institution": "University Name",
                    "degree": "Degree Name",
                    "fieldOfStudy": "Major",
                    "startDate": "YYYY-MM-DD (Estimate first day of year if only year provided)",
                    "endDate": "YYYY-MM-DD (or null if present)"
                }
            ],
            "experience": [
                {
                    "company": "Company Name",
                    "position": "Job Title",
                    "startDate": "YYYY-MM-DD",
                    "endDate": "YYYY-MM-DD (or null if present)",
                    "isCurrent": boolean,
                    "description": "Summary of responsibilities"
                }
            ]
        }
      }
      
      IMPORTANT:
      1. If a field is not found, return empty string "" or empty array [].
      2. Ensure dates are in YYYY-MM-DD format.
      3. Fix typos if obvious.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const parsedProfile = JSON.parse(response.text);
    return parsedProfile;
  } catch (error) {
    console.error("🚀 ~ parseCV ~ error:", error);
    throw new Error("Gagal mengekstrak informasi CV");
  }
};

module.exports = { analyzeMatch, parseCV };
