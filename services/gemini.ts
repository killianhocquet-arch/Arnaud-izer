
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export type PrebuiltVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private getPrompt() {
    return `Génère 3 versions "chelous" et DRÔLES basées sur le texte fourni :
               - Variation 1 (Le Glitch): Un désordre total, répétitions de syllabes, comme un robot cassé qui essaie d'être poli mais qui sature.
               - Variation 2 (Le Surréaliste): Remplace certains noms par des concepts absurdes (ex: "manger" devient "téléporter mon fromage"), garde une structure grammaticale mais le sens est totalement lunaire.
               - Variation 3 (Le Philosophe Bourré): Une version longue, confuse, avec des analogies foireuses et une syntaxe approximative, comme si quelqu'un essayait d'expliquer le sens de la vie après 4 verres.
            Retourne un objet JSON structuré selon le schéma demandé. Assure-toi que les textes sont vraiment drôles et décalés.`;
  }

  async analyzeAudio(base64Audio: string, mimeType: string): Promise<AnalysisResult> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyse cet audio. 1. Transcris exactement ce qui est dit. 2. ${this.getPrompt()}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  mood: { type: Type.STRING },
                },
                required: ["id", "text", "label", "description", "mood"],
              }
            }
          },
          required: ["original", "variations"],
        },
      },
    });

    const text = response.text || '';
    return JSON.parse(text) as AnalysisResult;
  }

  async analyzeText(inputText: string): Promise<AnalysisResult> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `Voici un texte : "${inputText}". ${this.getPrompt()}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  mood: { type: Type.STRING },
                },
                required: ["id", "text", "label", "description", "mood"],
              }
            }
          },
          required: ["original", "variations"],
        },
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    // Ensure 'original' matches what the user typed if the model hallucinated a transcript
    parsed.original = inputText;
    return parsed as AnalysisResult;
  }

  async speak(text: string, voice: PrebuiltVoice = 'Puck'): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Lis ceci avec une intonation exagérée, bizarre et comique, en insistant sur le côté absurde : ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Could not generate speech");
    return base64Audio;
  }
}

export const geminiService = new GeminiService();
