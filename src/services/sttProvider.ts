export interface TranscriptWord {
  text: string;
  startTime: number; // timeline-relative seconds
  endTime: number;
  confidence?: number;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  words?: TranscriptWord[];
}

export interface TranscriptResult {
  language: string;
  duration: number;
  segments: TranscriptSegment[];
  words?: TranscriptWord[];
}

export interface SpeechToTextProvider {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  transcribe: (audioBlob: Blob, language?: string, apiKey?: string) => Promise<TranscriptResult>;
}

/**
 * Web Speech API / Browser Native Speech Recognition Provider
 */
export class WebSpeechSTTProvider implements SpeechToTextProvider {
  id = 'web-speech';
  name = '🌐 Web Speech Engine (Local Browser)';
  description = 'Processed locally in browser using Web Speech recognition.';
  requiresApiKey = false;

  async transcribe(audioBlob: Blob, language: string = 'en-US'): Promise<TranscriptResult> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        reject(
          new Error(
            'Automatic captions are not supported in this browser. Please use Chrome/Edge or another transcription provider.'
          )
        );
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = language === 'auto' ? 'en-US' : language;

      const segments: TranscriptSegment[] = [];
      let startTime = 0;

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcriptText = event.results[i][0].transcript.trim();
            const confidence = event.results[i][0].confidence;
            const duration = Math.max(2, transcriptText.split(' ').length * 0.4);

            segments.push({
              startTime,
              endTime: startTime + duration,
              text: transcriptText,
            });

            startTime += duration + 0.2;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (segments.length > 0) {
          resolve({ language, duration: startTime, segments });
        } else {
          reject(new Error(`Speech recognition notice: ${event.error}`));
        }
      };

      recognition.onend = () => {
        if (segments.length > 0) {
          resolve({
            language,
            duration: startTime,
            segments,
          });
        } else {
          reject(new Error('No speech was detected in the media source. No captions were generated.'));
        }
      };

      recognition.start();
      setTimeout(() => recognition.stop(), 5000);
    });
  }
}

/**
 * OpenAI Whisper / Remote STT API Provider Adapter
 */
export class WhisperAPIProvider implements SpeechToTextProvider {
  id = 'whisper-api';
  name = '⚡ Whisper STT API Adapter (Word-Timestamps)';
  description = 'High precision word-level speech recognition (Requires user API key).';
  requiresApiKey = true;

  async transcribe(audioBlob: Blob, language: string = 'auto', apiKey?: string): Promise<TranscriptResult> {
    if (!apiKey) {
      throw new Error('API key required for Whisper API provider. Please enter your API key in the modal.');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    if (language !== 'auto') {
      formData.append('language', language);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Whisper API Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();

    const segments: TranscriptSegment[] = (data.segments || []).map((seg: any) => ({
      startTime: seg.start,
      endTime: seg.end,
      text: seg.text.trim(),
      words: (seg.words || []).map((w: any) => ({
        text: w.word.trim(),
        startTime: w.start,
        endTime: w.end,
      })),
    }));

    const words: TranscriptWord[] = (data.words || []).map((w: any) => ({
      text: w.word.trim(),
      startTime: w.start,
      endTime: w.end,
    }));

    if (segments.length === 0) {
      throw new Error('No speech was detected in the media source. No captions were generated.');
    }

    return {
      language: data.language || language,
      duration: data.duration || 10,
      segments,
      words,
    };
  }
}

export const STT_PROVIDERS: SpeechToTextProvider[] = [
  new WebSpeechSTTProvider(),
  new WhisperAPIProvider(),
];
